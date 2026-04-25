import { test, expect } from '@playwright/test'

test.describe('App smoke (demo auth)', () => {
  test('root redirects to onboarding for incomplete demo profile', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('נתחיל')
  })

  test('upload page renders 4-step wizard with contract step active', async ({ page }) => {
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: 'בדיקה חדשה', level: 1 })).toBeVisible()
    const stepper = page.getByRole('navigation', { name: 'שלבים' })
    await expect(stepper).toBeVisible()
    await expect(stepper).toContainText('העלאת חוזה')
    await expect(stepper).toContainText('העלאת תלוש')
    await expect(stepper).toContainText('סקירה')
    await expect(stepper).toContainText('ניתוח')
    await expect(page.getByText('גרור את חוזה ההעסקה לכאן').first()).toBeVisible()
  })

  test('dashboard shows demo user in sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    const sidebar = page.getByRole('complementary')
    await expect(sidebar.getByText('משתמש לדוגמה')).toBeVisible()
  })

  test('no console errors across core routes', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    for (const path of ['/', '/upload', '/dashboard', '/tools']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toEqual([])
  })
})
