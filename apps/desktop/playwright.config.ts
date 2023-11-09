import type { PlaywrightTestConfig } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './test',
  fullyParallel: true,
  timeout: process.env.CI ? 50_000 : 30_000,
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    env: {
      COVERAGE: process.env.COVERAGE === 'true' ? 'true' : '',
    }
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
