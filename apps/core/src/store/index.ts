import { Schema, Workspace } from '@blocksuite/store'
import { atom, type Atom } from 'jotai/vanilla'
import { atomEffect } from 'jotai-effect'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'
import { currentWorkspaceIdAtom } from '@mini-affine/infra'
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
  Atom<void>
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
  const workspaceAtom = atom<Promise<Workspace>>(async () => {
    const workspace = getOrCreateWorkspace(id)
    const binary = await downloadBinary(workspace.doc.guid, 'mini-affine-db')
    if (binary) {
      applyUpdate(workspace.doc, binary)
    }
    return workspace
  })
  const workspaceEffectAtom = atomEffect((get) => {
    const abortController = new AbortController()
    const workspacePromise = get(workspaceAtom)
    let indexedDBProvider: ReturnType<typeof createIndexedDBProvider>
    workspacePromise.then(() => {
      if (abortController.signal.aborted) {
        return
      }
      indexedDBProvider = createIndexedDBProvider(workspace.doc, 'mini-affine-db')
      indexedDBProvider.connect()
    })
    return () => {
      abortController.abort()
      indexedDBProvider.disconnect()
    }
  })
  workspaceAtomWeakMap.set(workspace, workspaceAtom)
  workspaceEffectAtomWeakMap.set(workspace, workspaceEffectAtom)
  return [workspaceAtom, workspaceEffectAtom]
}

export const currentWorkspaceAtom = atom<Promise<Workspace>>(async get => {
  const currentWorkspaceId = get(currentWorkspaceIdAtom)
  if (currentWorkspaceId === null) {
    throw new Error('Current workspace id is null')
  }
  const [workspaceAtom, effectAtom] = getWorkspaceAtom(currentWorkspaceId)
  get(effectAtom)
  return get(workspaceAtom)
})
