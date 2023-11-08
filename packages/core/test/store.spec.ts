import { expect, test, vi } from 'vitest'
import { workspaceManager } from '../src/store/index'
import { getDefaultStore } from 'jotai/vanilla'

test('should throw error when page not found', async () => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  const store = getDefaultStore()

  await store.get(workspaceAtom)
  const pageAtom = workspaceManager.getWorkspacePageAtom('test-workspace',
    'test-page')
  await expect(async () => await store.get(pageAtom)).rejects.toThrow()
})

test('should get page when page exist', async () => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  const store = getDefaultStore()

  const workspace = await store.get(workspaceAtom)
  const page = workspace.createPage({ id: 'page0' })
  const pageAtom = workspaceManager.getWorkspacePageAtom('test-workspace',
    'page0')
  expect(await store.get(pageAtom)).toBe(page)
})

test('should inject works', async () => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  const store = getDefaultStore()
  await workspaceManager.with(
    async (workspace) => {
      workspace.createPage({ id: 'page0' })
    },
    (workspace) => {
      return {
        connect: () => {
          workspace.createPage({
            id: 'page1'
          })
        },
        disconnect: () => {
          workspace.removePage('page1')
        }
      }
    })
  await workspaceManager.inject()
  const workspace = await store.get(workspaceAtom)
  {
    expect(workspace.getPage('page0')?.id).toEqual('page0')
    expect(workspace.getPage('page1')).toBeNull()
    const unsub = store.sub(workspaceAtom, vi.fn())
    expect(workspace.getPage('page1')).toBeNull()
    unsub()
  }

  {
    const effectAtom = workspaceManager.getWorkspaceEffectAtom('test-workspace')
    const unsub = store.sub(effectAtom, vi.fn())
    await vi.waitFor(() => {
      expect(workspace.getPage('page1')?.id).toEqual('page1')
    })
    unsub()
    await vi.waitFor(() => {
      expect(workspace.getPage('page1')).toBeNull()
    })
  }

  await workspaceManager.inject()
})
