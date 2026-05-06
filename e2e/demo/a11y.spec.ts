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

    // Stage H2 — hard-fail on critical/serious violations.
    // Minor + moderate are still warned-only so easy wins flag without
    // gating CI. Tighten further in a follow-up once the inventory is clean.
    const blocking = result.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    )

    if (result.violations.length > 0) {
      console.warn(`[a11y] ${route} — ${result.violations.length} violations`)
      for (const v of result.violations) {
        console.warn(`  · ${v.id} (${v.impact}): ${v.description}`)
      }
    }

    expect(blocking, `Critical/serious a11y violations on ${route}: ` +
      blocking.map(v => `${v.id}(${v.impact})`).join(', ')).toEqual([])
  })
}
