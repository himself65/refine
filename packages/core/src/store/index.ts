import { Page, Schema, Workspace } from '@blocksuite/store'
import { atom, type Atom } from 'jotai/vanilla'
import { atomEffect } from 'jotai-effect'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'
import { applyUpdate } from 'yjs'
import { inject } from 'jotai-inject/vanilla'

export type Preload = (workspace: Workspace) => Promise<void>
export type ProviderCreator = (workspace: Workspace) => {
  connect: () => void,
  disconnect: () => void
}

function assertExists<T> (
  value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'value is null or undefined')
  }
}

/**
 * @internal
 */
export const globalWorkspaceMap = new Map<string, Workspace>()

export class WorkspaceManager {
  #workspaceAtomWeakMap = new WeakMap<Workspace, Atom<Promise<Workspace>>>()
  #workspacePageAtomWeakMap = new WeakMap<
    Atom<Promise<Workspace>>,
    Map<string, Atom<Promise<Page>>>
  >()
  #workspaceEffectAtomWeakMap = new WeakMap<
    Workspace,
    Atom<unknown>
  >()

  #upgradeAbortController = new AbortController()

  get upgradeAbortSignal () {
    return this.#upgradeAbortController.signal
  }

  readonly #schema = new Schema()

  #preloads: Preload[] = []
  #providers: ProviderCreator[] = []

  public readonly preloadAtom = atom<Preload[]>([])
  public readonly providerAtom = atom<ProviderCreator[]>([])

  constructor () {
    this.#schema.register(AffineSchemas).register(__unstableSchemas)
  }

  get schema () {
    return this.#schema
  }

  private checkIfUpgradeNeeded = async (workspace: Workspace) => {
    const blockVersions = workspace.meta.blockVersions
    if (blockVersions) {
      this.#schema.flavourSchemaMap.forEach((schema, flavour) => {
        const version = blockVersions[flavour]
        if (schema.version !== version) {
          this.#upgradeAbortController.abort()
        }
      })
    } else {
      console.warn(
        'blockVersions not found.\n' +
        'This may be caused by data not loaded yet.')
    }
  }

  getWorkspaceAtom = (workspaceId: string): Atom<Promise<Workspace>> => {
    let workspace = globalWorkspaceMap.get(workspaceId)
    if (!workspace) {
      workspace = new Workspace({
        id: workspaceId,
        schema: this.#schema
      })
      globalWorkspaceMap.set(workspaceId, workspace)
    }
    {
      const workspaceAtom = this.#workspaceAtomWeakMap.get(workspace)
      if (workspaceAtom) {
        return workspaceAtom
      }
    }
    {
      const ensureWorkspace = workspace
      const workspaceAtom = atom(async (get) => {
        const preloads = get(this.preloadAtom)
        for (const preload of preloads) {
          await preload(ensureWorkspace)
          await this.checkIfUpgradeNeeded(ensureWorkspace)
        }
        return ensureWorkspace
      })
      this.#workspaceAtomWeakMap.set(workspace, workspaceAtom)
      return workspaceAtom
    }
  }

  getWorkspacePageAtom = (
    workspaceId: string,
    pageId: string
  ): Atom<Promise<Page>> => {
    const workspaceAtom = this.getWorkspaceAtom(workspaceId)
    let map: Map<string, Atom<Promise<Page>>>
    if (this.#workspacePageAtomWeakMap.has(workspaceAtom)) {
      map = this.#workspacePageAtomWeakMap.get(workspaceAtom) as Map<
        string,
        Atom<Promise<Page>>
      >
    } else {
      map = new Map()
      this.#workspacePageAtomWeakMap.set(workspaceAtom, map)
    }

    if (map.has(pageId)) {
      return map.get(pageId) as Atom<Promise<Page>>
    }

    const primitivePageAtom = atom<Page | null>(null)
    const pageAtom = atom(async (get) => {
      const primitivePage = get(primitivePageAtom)
      if (primitivePage !== null) {
        return primitivePage
      }
      const workspace = await get(workspaceAtom)
      const page = workspace.getPage(pageId)
      if (page === null) {
        return new Promise<Page>(() => {})
      }
      if (!page.loaded) {
        await page.waitForLoaded()
      }
      return page
    })
    primitivePageAtom.onMount = (setSelf) => {
      const workspace = globalWorkspaceMap.get(workspaceId)
      assertExists(workspace)
      if (workspace.getPage(pageId) !== null) {
        setSelf(workspace.getPage(pageId))
      }
      const onPageRemoved = workspace.slots.pageRemoved.on((id) => {
        if (id === pageId) {
          setSelf(null)
        }
      })
      const onPageAdded = workspace.slots.pageAdded.on((id) => {
        if (id === pageId) {
          setSelf(workspace.getPage(pageId))
        }
      })
      return () => {
        onPageRemoved.dispose()
        onPageAdded.dispose()
      }
    }
    map.set(pageId, pageAtom)
    return pageAtom
  }

  getWorkspaceEffectAtom = (workspaceId: string): Atom<void> => {
    let workspace = globalWorkspaceMap.get(workspaceId)
    if (!workspace) {
      workspace = new Workspace({
        id: workspaceId,
        schema: this.#schema
      })
      globalWorkspaceMap.set(workspaceId, workspace)
    }
    {
      const workspaceEffectAtom = this.#workspaceEffectAtomWeakMap.get(
        workspace)
      if (workspaceEffectAtom) {
        return workspaceEffectAtom
      }
    }
    {
      const workspaceEffectAtom = atomEffect((get) => {
        const workspacePromise = get(this.getWorkspaceAtom(workspaceId))
        const abortController = new AbortController()
        workspacePromise.then((workspace) => {
          if (abortController.signal.aborted) {
            return
          }
          const providers = get(this.providerAtom)
          for (const providerCreator of providers) {
            const provider = providerCreator(workspace)
            provider.connect()
            abortController.signal.addEventListener('abort', () => {
              provider.disconnect()
            })
          }
        })
        return () => {
          abortController.abort()
        }
      })
      this.#workspaceEffectAtomWeakMap.set(workspace, workspaceEffectAtom)
      return workspaceEffectAtom
    }
  }

  #injected = false

  get injected () {
    return this.#injected
  }

  public withLocalProvider = async () => {
    const {
      createIndexedDBProvider,
      downloadBinary
    } = await import('@toeverything/y-indexeddb')
    this.#preloads.push(async (workspace) => {
      const binary = await downloadBinary(workspace.doc.guid,
        'refine-indexeddb')
      if (binary) {
        // only download root doc
        applyUpdate(workspace.doc, binary)
      }
    })
    this.#providers.push((workspace) => {
      const provider = createIndexedDBProvider(workspace.doc,
        'refine-indexeddb')
      return {
        connect: () => {
          provider.connect()
        },
        disconnect: () => {
          provider.disconnect()
        }
      }
    })
  }

  public with = async (
    preload?: Preload, providerCreator?: ProviderCreator) => {
    preload && this.#preloads.push(preload)
    providerCreator && this.#providers.push(providerCreator)
  }

  public inject = async () => {
    if (this.#injected) {
      return
    }

    inject(this.preloadAtom, () => this.#preloads)
    inject(this.providerAtom, () => this.#providers)

    this.#injected = true
  }
}

export const workspaceManager = new WorkspaceManager()

type PageMeta = {
  id: string;
  title: string;
  tags: string[];
  createDate: number;
}

const pageListAtomWeakMap = new WeakMap<Workspace, Atom<PageMeta[]>>()

export function getPageListAtom (
  workspace: Workspace
): Atom<PageMeta[]> {
  let pageListAtom = pageListAtomWeakMap.get(workspace)
  if (!pageListAtom) {
    const primitivePageListAtom = atom<PageMeta[]>([])
    const effectAtom = atomEffect((_, set) => {
      set(primitivePageListAtom, [...workspace.meta.pageMetas])
      const onPageMetaAdded = workspace.meta.pageMetasUpdated.on(() => {
        set(primitivePageListAtom, [...workspace.meta.pageMetas])
      })
      return () => {
        onPageMetaAdded.dispose()
      }
    })

    pageListAtom = atom<PageMeta[]>((get) => {
      get(effectAtom)
      return get(primitivePageListAtom)
    })
    pageListAtomWeakMap.set(workspace, pageListAtom)
  }
  return pageListAtom
}
