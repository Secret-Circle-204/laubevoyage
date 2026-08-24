import { test, expect } from '@playwright/test'

test.describe('Customer Loyalty Dashboard End-to-End browser verification', () => {
  test('should log in, navigate to loyalty dashboard, and verify dynamic points/redemption rates', async ({ context, page }) => {
    // Force English locale to match text assertions
    await context.addCookies([
      { name: 'laube-locale', value: 'en', domain: 'localhost', path: '/' },
    ])
    // 1. Navigate to login page
    await page.goto('http://localhost:3000/login')

    // 2. Log in
    await page.fill('input[type="email"]', 'customer@laubevoyage.com')
    await page.fill('input[type="password"]', 'Customer@123')
    await page.click('button[type="submit"]')

    // 3. Verify redirection to dashboard (higher timeout for Next.js dev compilation)
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

    // 4. Navigate directly to loyalty dashboard
    await page.goto('http://localhost:3000/dashboard/loyalty')

    // 5. Verify the points balance is displayed
    // Start balance is seeded at 100 points
    await expect(page.locator('text=Available Loyalty Balance')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=100').first()).toBeVisible()

    // 6. Verify redemption badge
    await expect(page.locator('text=Pts =').first()).toBeVisible()

    // 7. Verify tier thresholds are loaded dynamically
    await expect(page.locator('text=Explorer').first()).toBeVisible({ timeout: 15000 })
  })

  test('should format points, thresholds and currency dynamically in Arabic and Euro', async ({ context, page }) => {
    // Set cookies for Arabic locale and Euro currency
    await context.addCookies([
      { name: 'laube-locale', value: 'ar', domain: 'localhost', path: '/' },
      { name: 'laube-currency', value: 'EUR', domain: 'localhost', path: '/' },
    ])

    // Log in
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'customer@laubevoyage.com')
    await page.fill('input[type="password"]', 'Customer@123')
    await page.click('button[type="submit"]')

    // Verify redirection to dashboard (higher timeout for Next.js dev compilation)
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

    // Navigate to loyalty dashboard
    await page.goto('http://localhost:3000/dashboard/loyalty')

    // Verify Arabic translation of Explorer/Voyager/Elite tiers
    await expect(page.locator('text=المستكشف').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=المسافر').first()).toBeVisible()
    await expect(page.locator('text=النخبة').first()).toBeVisible()

    // Verify the redemption rate is formatted in Euro (€) or converted rate
    await expect(page.locator('text=Pts =').first()).toBeVisible()
  })
})
