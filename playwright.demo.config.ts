/**
 * Playwright config for demo-auth flow tests.
 *
 * Stage B (B5/B6/B7) — runs the SPA with VITE_DEMO_AUTH=true so protected
 * routes render without a real Supabase session. Lets us exercise the
 * upload + protected-page UI deterministically in CI without baking secrets.
 *
 * Use a different port than the primary config (5173) so both can coexist.
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/demo',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-demo' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --configLoader native --port 5174 --host 127.0.0.1',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: {
      VITE_DEMO_AUTH: 'true',
      VITE_SUPABASE_URL: 'https://demo.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'demo-anon-key-not-real-just-for-typing',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
