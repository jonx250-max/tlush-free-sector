/**
 * B6 — axe-core accessibility baseline.
 *
 * Runs axe on the four existing protected routes under demo-auth. WCAG 2.2
 * level AA. Records baseline violation counts; Stage H tightens to zero
 * critical violations once the diff viewer ships.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/upload', '/history', '/profile', '/tools']

for (const route of ROUTES) {
  test(`a11y baseline — ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    // Stage B baseline: report only, do not fail. Stage H item H2 will
    // hard-fail on critical/serious violations once the UI work lands.
    if (result.violations.length > 0) {
      console.warn(`[a11y] ${route} — ${result.violations.length} violations`)
      for (const v of result.violations) {
        console.warn(`  · ${v.id} (${v.impact}): ${v.description}`)
      }
    }

    // We expect at least no system-level errors from axe itself.
    expect(result).toBeDefined()
  })
}
