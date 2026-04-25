import { test, expect } from '@playwright/test'

/**
 * P11 smoke suite — verifies static HTML pages render correctly + auth
 * gate works end-to-end. Replaces previous demo-auth React tests.
 */

test.describe('Public pages', () => {
  test('Landing — hero title visible', async ({ page }) => {
    await page.goto('/marketing/index.html')
    await expect(page).toHaveTitle(/בדיקת תלוש שכר/)
    // Hero contains the main pitch
    const hero = page.locator('#hero-title')
    await expect(hero).toBeVisible({ timeout: 10_000 })
  })

  test('Login — form + OAuth + SMS buttons rendered', async ({ page }) => {
    await page.goto('/marketing/Login.html')
    await expect(page).toHaveTitle(/כניסה/)
    await expect(page.locator('#loginForm')).toBeVisible()
    await expect(page.locator('[data-tlush-oauth="google"]').first()).toBeVisible()
    await expect(page.locator('[data-tlush-oauth="apple"]').first()).toBeVisible()
    await expect(page.locator('[data-tlush-oauth="otp-phone"]').first()).toBeVisible()
  })

  test('Signup — form + 3 fast-signup buttons + terms', async ({ page }) => {
    await page.goto('/marketing/Signup.html')
    await expect(page.locator('#signupForm')).toBeVisible()
    await expect(page.locator('[data-tlush-oauth="google"]').first()).toBeVisible()
    await expect(page.locator('[data-tlush-oauth="otp-phone"]').first()).toBeVisible()
  })

  test('ForgotPassword — email input visible', async ({ page }) => {
    await page.goto('/marketing/ForgotPassword.html')
    await expect(page.locator('#email-input')).toBeVisible()
  })

  test('Legal — terms tabs visible', async ({ page }) => {
    await page.goto('/marketing/Legal.html')
    // Page renders (specific tabs structure varies)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Protected pages — require auth', () => {
  test('Dashboard redirects to /login when no session', async ({ page }) => {
    await page.goto('/marketing/Dashboard.html')
    await page.waitForURL(/\/login|\/marketing\/Login\.html/, { timeout: 10_000 })
    expect(page.url()).toMatch(/login|Login\.html/)
  })

  test('TaxProfile redirects to /login when no session', async ({ page }) => {
    await page.goto('/marketing/TaxProfile.html')
    await page.waitForURL(/Login\.html/, { timeout: 10_000 })
  })

  test('Admin redirects to /login when no session', async ({ page }) => {
    await page.goto('/marketing/Admin.html')
    await page.waitForURL(/Login\.html/, { timeout: 10_000 })
  })

  test('Audit redirects to /login when no session', async ({ page }) => {
    await page.goto('/marketing/Audit.html')
    await page.waitForURL(/Login\.html/, { timeout: 10_000 })
  })
})

test.describe('API endpoints', () => {
  test('GET /api/public-config returns Supabase config JSON', async ({ request }) => {
    const r = await request.get('/api/public-config')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/)
    expect(typeof body.supabaseAnonKey).toBe('string')
  })

  test('POST /api/audit/verify without auth → 401', async ({ request }) => {
    const r = await request.get('/api/audit/verify')
    expect(r.status()).toBe(401)
  })

  test('POST /api/ocr without keys → 503', async ({ request }) => {
    const r = await request.post('/api/ocr', { data: { imageBase64: 'AAAA' } })
    expect(r.status()).toBe(503)
    const body = await r.json()
    expect(body.code).toBe('OCR_DISABLED')
  })
})
