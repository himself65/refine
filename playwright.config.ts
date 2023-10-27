import type { PlaywrightTestConfig } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  fullyParallel: true,
  timeout: process.env.CI ? 50_000 : 30_000,
  webServer: {
    command: 'pnpm run dev --filter core',
    port: 5173
  },
  reporter: process.env.CI
    ? [
      ['html', { open: 'never', outputFolder: 'artifacts/html-report' }],
      ['github'],
      ['line'],
    ]
    : 'list'
}

if (process.env.CI) {
  config.retries = 3
  config.workers = '50%'
}

export default config
