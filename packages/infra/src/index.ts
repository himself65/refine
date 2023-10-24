import { atom } from 'jotai/vanilla'
import { atomWithStorage } from 'jotai/utils'

type WorkspaceFlavour = 'local' | 'server'

export type WorkspaceMeta = {
  id: string
  type: WorkspaceFlavour[]
}

export const workspaceMetaAtom = atomWithStorage<WorkspaceMeta[]>(
  'workspace-meta', [])
export const currentWorkspaceIdAtom = atom<string | null>(null)
