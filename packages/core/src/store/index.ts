import { Schema, Workspace } from '@blocksuite/store'
import { atom, type Atom } from 'jotai/vanilla'
import { atomEffect } from 'jotai-effect'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'
import { applyUpdate } from 'yjs'
import { inject } from 'jotai-inject'

export type Preload = (workspace: Workspace) => Promise<void>
export type ProviderCreator = (workspace: Workspace) => {
  connect: () => void,
  disconnect: () => void
}

/**
 * @internal
 */
export const globalWorkspaceMap = new Map<string, Workspace>()

class WorkspaceManager {
  #wokrspaceAtomWeakMap = new WeakMap<Workspace, Atom<Promise<Workspace>>>()
  #workspaceEffectAtomWeakMap = new WeakMap<
    Workspace,
    Atom<unknown>
  >()

  readonly #schema = new Schema()

  #preloads: Preload[] = []
  #providers: ProviderCreator[] = []

  public readonly preloadAtom = atom<Preload[]>([])
  public readonly providerAtom = atom<ProviderCreator[]>([])

  constructor () {
    this.#schema.register(AffineSchemas).register(__unstableSchemas)
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
      const workspaceAtom = this.#wokrspaceAtomWeakMap.get(workspace)
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
        }
        return ensureWorkspace
      })
      this.#wokrspaceAtomWeakMap.set(workspace, workspaceAtom)
      return workspaceAtom
    }
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
      const binary = await downloadBinary(workspace.doc.guid, 'refine-db')
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

  public with = async (preload?: Preload, providerCreator?: ProviderCreator) => {
    preload && this.#preloads.push(preload)
    providerCreator && this.#providers.push(providerCreator)
  }

  public inject = async () => {
    if (this.#injected) {
      return
    }

    function unreachable () {
      throw new Error('unreachable')
    }

    inject(this.preloadAtom, () => this.#preloads, unreachable)
    inject(this.providerAtom, () => this.#providers, unreachable)

    this.#injected = true
  }
}

export const workspaceManager = new WorkspaceManager()
