import { expect, test } from 'vitest'
import { workspaceManager } from '../src/store/index'
import { getDefaultStore } from 'jotai/vanilla'

test('workspaceManager', async () => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  const store = getDefaultStore()

  await store.get(workspaceAtom)
  const pageAtom = workspaceManager.getWorkspacePageAtom('test-workspace',
    'test-page')
  await expect(async () => await store.get(pageAtom)).rejects.toThrow()
})
