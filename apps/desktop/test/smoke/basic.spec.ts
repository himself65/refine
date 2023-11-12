import { test } from '../utils'
import crypto from 'node:crypto'
import type { getDefaultStore } from 'jotai/vanilla'
import type { workspaceManager } from '@refine/core/store'
import { expect } from '@playwright/test'

declare global {
  interface Window {
    store: ReturnType<typeof getDefaultStore>
    workspaceManager: typeof workspaceManager
  }
}

test.describe('workspaceManager', () => {
  test('should workspaceManager basic functionality works',
    async ({ page }) => {
      const randomId = crypto.randomUUID()
      await page.evaluate(async ([randomId]) => {
        const store = window.store
        const manager = window.workspaceManager
        await manager.withLocalProvider()
        await manager.inject()
        const workspaceAtom = manager.getWorkspaceAtom(randomId)
        const effectAtom = manager.getWorkspaceEffectAtom(randomId)
        const workspace = await store.get(workspaceAtom)
        const unsub = store.sub(effectAtom, () => void 0)
        const page = workspace.createPage('page0')
        await page.waitForLoaded()
        const pageBlockId = page.addBlock('affine:page', {
          children: [],
          title: new page.Text('Untitled')
        })
        page.addBlock('affine:surface', {}, pageBlockId)
        const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
        page.addBlock('affine:paragraph', {
          text: new page.Text('test')
        }, noteBlockId)
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve(unsub)
          }, 200)
        })
      }, [randomId])
      await page.reload()
      await page.evaluate(async ([randomId]) => {
        const store = window.store
        const manager = window.workspaceManager
        await manager.withLocalProvider()
        await manager.inject()
        const workspaceAtom = manager.getWorkspaceAtom(randomId)
        const effectAtom = manager.getWorkspaceEffectAtom(randomId)
        const workspace = await store.get(workspaceAtom)
        await store.get(workspaceAtom)
        store.sub(effectAtom, () => void 0)
        const page = workspace.getPage('page0')
        await page?.waitForLoaded()
      }, [randomId])
      await page.waitForTimeout(200)
      const snapshot = await page.evaluate(async ([randomId]) => {
        const store = window.store
        const manager = window.workspaceManager
        await manager.withLocalProvider()
        await manager.inject()
        const workspaceAtom = manager.getWorkspaceAtom(randomId)
        const workspace = await store.get(workspaceAtom)
        const page = workspace.getPage('page0')
        if (page === null) {
          throw new Error('page not found')
        }
        return page.getBlockByFlavour('affine:paragraph')[0].text?.toString()
      }, [randomId])
      expect(snapshot).toBe('test')
    })
})
