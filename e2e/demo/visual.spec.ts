/**
 * B7 — visual regression baseline for the marketing landing.
 *
 * Locks the static landing page snapshot. Stage H expands snapshots to
 * cover the diff viewer + responsive breakpoints once UI lands.
 */

import { test, expect } from '@playwright/test'

test.describe('Visual regression — landing', () => {
  test('Landing hero snapshot', async ({ page }) => {
    await page.goto('/marketing/index.html')
    await page.waitForLoadState('networkidle')
    // Wait for fonts + above-the-fold content.
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('landing-hero.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    })
  })
})
