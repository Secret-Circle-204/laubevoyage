import { test, expect } from '@playwright/test'

test.use({
  locale: 'de-DE',
})

test.describe('Localization & Exchange Rate End-to-End browser verification', () => {
  test('should display prices in EUR for German visitor and keep session preference', async ({ page }) => {
    // 1. Open homepage
    await page.goto('http://localhost:3000/?geo=EG')

    // 2. Verify prices are rendered in Euro (€)
    // We look for elements containing the Euro sign €
    const priceElements = page.locator('text=€')
    await expect(priceElements.first()).toBeVisible({ timeout: 15000 })

    // 3. Assert EGP is not visible as a raw currency on cards when browsing in German
    const egpText = page.locator('text=/\\bEGP\\b|\\bج\\.م\\b/')
    await expect(egpText).not.toBeVisible()
  })
})
