/**
 * B5 — demo-auth happy path.
 *
 * Asserts the SPA renders protected pages when VITE_DEMO_AUTH=true.
 * Full upload → diff → demand-letter flow is gated on Stage H (DiscrepancyViewer)
 * and Stage E (calculator outputs); this spec proves the auth + routing
 * skeleton works end-to-end without real Supabase.
 */

import { test, expect } from '@playwright/test'

test.describe('Demo-auth — protected pages render', () => {
  test('Upload page accessible without real Supabase session', async ({ page }) => {
    await page.goto('/upload')
    // Demo user is auto-signed-in; ProtectedRoute should not redirect.
    await expect(page).toHaveURL(/\/upload/)
    // Page body renders (specific selectors land in Stage H tests).
    await expect(page.locator('body')).toBeVisible()
  })

  test('History page accessible', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/history/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('Profile page accessible', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('Tools page accessible', async ({ page }) => {
    await page.goto('/tools')
    await expect(page).toHaveURL(/\/tools/)
    await expect(page.locator('body')).toBeVisible()
  })
})
