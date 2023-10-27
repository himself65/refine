import { Schema, Workspace } from '@blocksuite/store'
import { atom, type Atom } from 'jotai/vanilla'
import { atomEffect } from 'jotai-effect'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'
import {
  createIndexedDBProvider,
  downloadBinary
} from '@toeverything/y-indexeddb'
import { applyUpdate } from 'yjs'

const schema = new Schema()

schema.register(AffineSchemas).register(__unstableSchemas)

const workspaceMap = new Map<string, Workspace>()

export function getOrCreateWorkspace (id: string) {
  let workspace = workspaceMap.get(id)
  if (!workspace) {
    workspace = new Workspace({
      id,
      schema
    })
    workspaceMap.set(id, workspace)
  }
  return workspace
}

const workspaceAtomWeakMap = new WeakMap<Workspace, Atom<Promise<Workspace>>>()
const workspaceEffectAtomWeakMap = new WeakMap<
  Workspace,
  Atom<unknown>
>()

export function getWorkspaceAtom (id: string): [
  Atom<Promise<Workspace>>,
  Atom<void>
] {
  const workspace = getOrCreateWorkspace(id)
  if (workspaceAtomWeakMap.has(workspace)
    && workspaceEffectAtomWeakMap.has(workspace)) {
    return [
      workspaceAtomWeakMap.get(workspace)!,
      workspaceEffectAtomWeakMap.get(workspace)!
    ]
  }
  const workspaceAtom = atom(async () => {
    const workspace = getOrCreateWorkspace(id)
    const binary = await downloadBinary(workspace.doc.guid, 'mini-affine-db')
    if (binary) {
      applyUpdate(workspace.doc, binary)
    }
    return workspace
  })
  const workspaceEffectAtom = atomEffect((get) => {
    const workspacePromise = get(workspaceAtom)
    const abortController = new AbortController()
    workspacePromise.then((workspace) => {
      if (abortController.signal.aborted) {
        return
      }
      const provider = createIndexedDBProvider(workspace.doc, 'mini-affine-db')
      provider.connect()
      abortController.signal.addEventListener('abort', () => {
        provider.disconnect()
      })
    })
    return () => {
      abortController.abort()
    }
  })
  workspaceAtomWeakMap.set(workspace, workspaceAtom)
  workspaceEffectAtomWeakMap.set(workspace, workspaceEffectAtom)
  return [workspaceAtom, workspaceEffectAtom]
}
