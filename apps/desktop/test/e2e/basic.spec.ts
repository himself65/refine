import {
  expect
} from '@playwright/test'
import type { Workspace } from '@blocksuite/store'
import { Page } from '@blocksuite/store'
import { test } from '../utils'

declare global {
  interface Window {
    workspace: Workspace
  }
}

test.describe('app basic functionality', () => {
  test('should editor basic functionality works', async ({ page }) => {
    await expect(page.getByText('Untitled')).toBeVisible()
    await page.evaluate(async () => {
      const workspace = window.workspace
      const pageId = [...workspace.pages.keys()][0]
      const page = workspace.getPage(pageId) as Page
      const noteId = page.getBlockByFlavour('affine:note')[0].id
      page.addBlock('affine:paragraph', {
        text: new page.Text('test')
      }, noteId)
    })
    await expect(page.getByText('test')).toBeVisible()
    await page.reload()
    await expect(page.getByText('test')).toBeVisible()
  })
})
