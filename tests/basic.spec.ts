import {
  expect,
  type Page,
  _electron as electron,
  type ElectronApplication,
  type ConsoleMessage
} from '@playwright/test'
import { resolve } from 'node:path'
import { main } from '../package.json'
import { test } from '@playwright/test'
import crypto from 'node:crypto'

let page: Page
let electronApp: ElectronApplication

const callback = (msg: ConsoleMessage) => {
  console.log(`${msg.type()}: ${msg.text()}`)
}

test.beforeAll('start electron app', async () => {
  const cacheDir = resolve(__dirname, '.cache')
  const guid = crypto.randomUUID()
  electronApp = await electron.launch({
    colorScheme: 'light',
    args: [main],
    cwd: resolve(__dirname, '..'),
    env: {
      VITE_DEV_SERVER_URL: 'http://localhost:5173',
      SESSION_DATA_PATH: resolve(cacheDir, guid)
    }
  })
  page = await electronApp.firstWindow()
  page.on('console', callback)
})

test.afterAll(async () => {
  page.off('console', callback)
  await page.close()
  await electronApp.close()
})

test.describe('playwright meets vitest', () => {
  test('has title', async () => {
    await expect(page.getByText('Untitled')).toBeVisible()
  })
})
