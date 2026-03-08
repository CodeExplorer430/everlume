import { defineConfig, devices } from '@playwright/test'

const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npm run dev:e2e:webpack'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: webServerCommand,
    cwd: __dirname,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'test_publishable_key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key',
      E2E_BYPASS_ADMIN_AUTH: process.env.E2E_BYPASS_ADMIN_AUTH || '1',
      E2E_FAKE_AUTH: process.env.E2E_FAKE_AUTH || '0',
      NEXT_PUBLIC_E2E_FAKE_AUTH: process.env.NEXT_PUBLIC_E2E_FAKE_AUTH || process.env.E2E_FAKE_AUTH || '0',
      E2E_PUBLIC_FIXTURES: process.env.E2E_PUBLIC_FIXTURES || '1',
      PRIVATE_MEDIA_TOKEN_SECRET: process.env.PRIVATE_MEDIA_TOKEN_SECRET || 'playwright-private-media-secret',
      PAGE_ACCESS_TOKEN_SECRET: process.env.PAGE_ACCESS_TOKEN_SECRET || 'playwright-page-access-secret',
      CAPTCHA_ENABLED: process.env.PLAYWRIGHT_CAPTCHA_ENABLED || '0',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.PLAYWRIGHT_TURNSTILE_SITE_KEY || '',
    },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 240 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
