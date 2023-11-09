import {
  expect,
  _electron as electron,
  type ConsoleMessage,
  type ElectronApplication
} from '@playwright/test'
import path, { resolve } from 'node:path'
import { main } from '../package.json'
import { test as baseTest } from '@playwright/test'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import type { Workspace } from '@blocksuite/store'
import { Page } from '@blocksuite/store'

const istanbulTempDir = path.join(__dirname, '..', '..', '..', '.nyc_output')

declare global {
  interface Window {
    __coverage__: Record<string, unknown>

    collectIstanbulCoverage (coverageJson: string): Promise<void>
    workspace: Workspace
  }
}

const test = baseTest.extend<{
  electronApp: ElectronApplication,
  firstWindow: Awaited<ReturnType<ElectronApplication['firstWindow']>>,
  context: never
}>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const cacheDir = resolve(__dirname, '.cache')
    const guid = crypto.randomUUID()
    const electronApp = await electron.launch({
      colorScheme: 'light',
      args: [
        main,
        '--force-device-scale-factor=1',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--enable-logging'
      ],
      cwd: resolve(__dirname, '..'),
      locale: 'en-US',
      executablePath: require('electron/index.js'),
      env: {
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
        SESSION_DATA_PATH: resolve(cacheDir, guid)
      }
    })
    await use(electronApp)
    await electronApp.close()
  },
  firstWindow: async ({ electronApp }, use) => {
    const firstWindow = await electronApp.firstWindow()
    const enableCoverage = process.env.COVERAGE === 'true'
    if (enableCoverage) {
      await firstWindow.addInitScript(() =>
        window.addEventListener('beforeunload', () =>
          window.collectIstanbulCoverage(JSON.stringify(window.__coverage__))
        )
      )
      await fs.mkdir(istanbulTempDir, { recursive: true })
      await firstWindow.exposeFunction('collectIstanbulCoverage',
        async (coverageJSON: string) => {
          if (coverageJSON)
            await fs.writeFile(
              path.join(
                istanbulTempDir,
                `playwright_coverage_${crypto.randomUUID()}.json`
              ),
              coverageJSON
            )
        })
    }
    await use(firstWindow)
    if (enableCoverage) {
      await firstWindow.evaluate(() => {
        window.collectIstanbulCoverage(JSON.stringify(window.__coverage__))
      })
    }
    await firstWindow.close()
  },
  page: async ({ firstWindow: page }, use) => {
    const callback = (msg: ConsoleMessage) => {
      console.log(`${msg.type()}: ${msg.text()}`)
    }
    page.on('console', callback)
    await use(page)
    page.off('console', callback)
  }
})

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
