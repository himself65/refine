import 'fake-indexeddb/auto'
import { describe, expect, test, vi } from 'vitest'
import { workspaceManager } from '../src/store/index'
import { getDefaultStore } from 'jotai/vanilla'
import { indexedDB } from 'fake-indexeddb'

describe('correct usage', () => {
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
      const effectAtom = workspaceManager.getWorkspaceEffectAtom(
        'test-workspace')
      const unsub = store.sub(effectAtom, vi.fn())
      await vi.waitFor(() => {
        expect(workspace.getPage('page1')?.id).toEqual('page1')
      })
      unsub()
      await vi.waitFor(() => {
        expect(workspace.getPage('page1')).toBeNull()
      })
    }
  })
})

describe('edge cases', () => {
  test('call page before workspace should works', async () => {
    const pageAtom = workspaceManager.getWorkspacePageAtom('test-workspace', 'page0')
    const store = getDefaultStore()
    // await expect(async () => await store.get(pageAtom)).rejects.toThrow()
    const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
    const workspace = await store.get(workspaceAtom)
    workspace.createPage({ id: 'page0' })
    const unsub = store.sub(workspaceAtom, vi.fn())
    expect(await store.get(pageAtom)).toBe(workspace.getPage('page0'))
    unsub()
  })

  test('local indexeddb should works', async () => {
    const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
    const store = getDefaultStore()
    expect(workspaceManager.injected).toBe(false)
    await workspaceManager.withLocalProvider()
    expect(workspaceManager.injected).toBe(false)
    await workspaceManager.inject()
    expect(workspaceManager.injected).toBe(true)
    const originalOpen = indexedDB.open
    indexedDB.open = vi.fn(function (...args: unknown[]) {
      return originalOpen.call(indexedDB, ...args)
    })
    await store.get(workspaceAtom)
    const unsub = store.sub(workspaceAtom, vi.fn())
    unsub()
    expect(indexedDB.open).toBeCalled()
    indexedDB.open = originalOpen
  })

  test('run inject twice won\'t update the preloads and providers',
    async () => {
      const store = getDefaultStore()
      const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
      await store.get(workspaceAtom)
      await workspaceManager.inject()
      await workspaceManager.with(async () => {
        throw new Error('should not run')
      }, () => ({
        connect: () => {},
        disconnect: () => {}
      }))
      await workspaceManager.inject()
      const workspace = await store.get(workspaceAtom)
      expect(workspace.doc.store.clients.size).toBe(0)
      const secondWorkspaceAtom = workspaceManager.getWorkspaceAtom(
        'test-workspace-2')
      await store.get(secondWorkspaceAtom)
      expect(workspace.doc.store.clients.size).toBe(0)
    }
  )
})
