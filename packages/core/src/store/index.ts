import { Schema, Workspace } from '@blocksuite/store'
import { atom, type Atom } from 'jotai/vanilla'
import { atomEffect } from 'jotai-effect'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'
import {
  createIndexedDBProvider,
  downloadBinary
} from '@toeverything/y-indexeddb'
import { applyUpdate } from 'yjs'

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

  constructor (
    public preloads: Preload[],
    public providers: ProviderCreator[]
  ) {
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
      const workspaceAtom = atom(async () => {
        for (const preload of this.preloads) {
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
          for (const providerCreator of this.providers) {
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
}

export const workspaceManager = new WorkspaceManager(
  [
    async (workspace) => {
      const binary = await downloadBinary(workspace.doc.guid, 'mini-affine-db')
      if (binary) {
        // only download root doc
        applyUpdate(workspace.doc, binary)
      }
    }
  ],
  [
    (workspace) => {
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
    }
  ]
)
