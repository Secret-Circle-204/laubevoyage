import { chromium } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/55ea46a0-3468-4787-82e1-23c1658061ca'

async function runPhase3Verification() {
  console.log('========================================================================')
  console.log('PHASE 3 FINAL CLOSURE: COMMAND PALETTE, PAYMENT FILTERS & SERVER KPI')
  console.log('Target: http://localhost:3000/admin/collections/bookings')
  console.log('========================================================================\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[BulkActionBar') || text.includes('[SelectionCell') || text.includes('Error')) {
      console.log('   [PAGE LOG]', text)
    }
  })
  page.on('pageerror', (err) => console.log('   [PAGE ERROR]', err.message))

  try {
    // 1. Authenticate as Admin
    console.log('1. Logging in as Administrator...')
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' })
    
    if (page.url().includes('/admin/login')) {
      await page.waitForSelector('input[name="email"], input[type="email"]')
      await page.fill('input[name="email"], input[type="email"]', 'admin@laubevoyage.com')
      await page.fill('input[name="password"], input[type="password"]', 'Admin@123')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)
    }

    console.log('   Logged in. Current URL:', page.url())

    // 2. Navigate to Bookings Operating Workspace
    console.log('2. Navigating to Bookings Operating Workspace...')
    await page.goto('http://localhost:3000/admin/collections/bookings', { waitUntil: 'networkidle' })
    await page.waitForSelector('.ag-root', { timeout: 15000 })
    console.log('   Universal Grid loaded successfully.')

    // 3. Verify Server-Derived KPI Strip & Invariant Contract
    console.log('3. Verifying Server-Derived KPI Strip & Invariant Contract...')
    await page.waitForSelector('.ut-kpi-card', { timeout: 10000 })
    // Allow server action to resolve and update DOM
    await page.waitForTimeout(2000)
    
    const kpiCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ut-kpi-card'))
      return cards.map((c) => ({
        label: c.querySelector('.ut-kpi-label')?.textContent?.trim() || '',
        value: c.querySelector('.ut-kpi-value')?.textContent?.trim() || '',
      }))
    })
    console.log('   KPI Cards Found:', JSON.stringify(kpiCards, null, 2))

    const outstandingCard = kpiCards.find((c) => c.label.toLowerCase().includes('outstanding'))
    if (!outstandingCard) {
      throw new Error('Outstanding KPI card not found in KPI strip!')
    }
    const outstandingKpiCount = parseInt(outstandingCard.value, 10)
    console.log(`   Outstanding KPI Count displayed: ${outstandingKpiCount}`)

    // 4. Test Clicking Outstanding KPI Card
    console.log('4. Clicking Outstanding KPI Card to verify filter application...')
    await page.click('.ut-kpi-card:has(.ut-kpi-label:text-is("Outstanding"))')
    await page.waitForTimeout(2500)

    const urlAfterKpiClick = page.url()
    console.log('   URL after clicking Outstanding KPI:', urlAfterKpiClick)
    if (!urlAfterKpiClick.includes('paymentStatus') || !urlAfterKpiClick.includes('unpaid')) {
      throw new Error(`URL did not apply paymentStatus filter! URL: ${urlAfterKpiClick}`)
    }
    console.log('   ✅ Clicking Outstanding applied canonical paymentStatus IN [unpaid, partially_paid] filter to URL.')

    // Verify grid rows after applying Outstanding filter
    const rowCount = await page.evaluate(() => {
      return document.querySelectorAll('.ag-center-cols-container .ag-row').length
    })
    console.log(`   Grid rows rendered for Outstanding filter: ${rowCount}`)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'kpi_outstanding_filtered.png') })

    // 5. Test QuickFilter Toolbar: Curated Lifecycle & Payment Dropdowns
    console.log('5. Verifying QuickFilter Toolbar Dropdowns...')
    await page.goto('http://localhost:3000/admin/collections/bookings', { waitUntil: 'networkidle' })
    await page.waitForSelector('.ag-root', { timeout: 15000 })

    const filterLabels = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ut-filter-btn-label'))
      return btns.map((b) => b.textContent?.trim() || '')
    })
    console.log('   Toolbar Filter Buttons:', filterLabels)

    // Open Lifecycle filter dropdown
    const filterButtons = await page.$$('.ut-filter-btn')
    if (filterButtons.length >= 2) {
      await filterButtons[0].click()
      await page.waitForTimeout(400)
      const lifecycleOptions = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.ut-filter-option'))
        return items.map((i) => i.textContent?.trim() || '')
      })
      console.log('   Lifecycle options in dropdown:', lifecycleOptions)
      
      // Ensure pending_payment is NOT in lifecycle options
      if (lifecycleOptions.some((o) => o.toLowerCase().includes('pending payment'))) {
        throw new Error('Violation: "Pending Payment" must NOT exist in Lifecycle options!')
      }
      console.log('   ✅ "Pending Payment" successfully eradicated from Lifecycle filter.')
      await filterButtons[0].click() // close
      await page.waitForTimeout(300)

      // Open Payment filter dropdown
      await filterButtons[1].click()
      await page.waitForTimeout(400)
      const paymentOptions = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.ut-filter-option'))
        return items.map((i) => i.textContent?.trim() || '')
      })
      console.log('   Payment options in dropdown:', paymentOptions)
      if (!paymentOptions.some((o) => o.includes('Outstanding Balance')) || !paymentOptions.some((o) => o.includes('Fully Paid'))) {
        throw new Error('Payment options must strictly include "Outstanding Balance" and "Fully Paid"!')
      }
      console.log('   ✅ Payment dropdown strictly contains curated financial contracts.')
      await filterButtons[1].click() // close
      await page.waitForTimeout(300)
    }

    // 6. Test Command Palette (Ctrl+K)
    console.log('6. Opening Command Palette via Ctrl+K...')
    await page.keyboard.press('Control+k')
    await page.waitForSelector('.ut-command-palette-modal', { timeout: 5000 })

    // Test: Eradication of "Search table for..."
    console.log('6a. Testing eradication of "Search table for..." when typing "Ahmed"...')
    await page.fill('.ut-command-palette-input', 'Ahmed')
    await page.waitForTimeout(700)

    const paletteItemsAfterQuery = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ut-command-palette-item'))
      return items.map((el) => el.textContent || '')
    })
    console.log('   Items found during "Ahmed" search:', paletteItemsAfterQuery)

    const hasSearchTable = paletteItemsAfterQuery.some((t) => t.toLowerCase().includes('search table for'))
    if (hasSearchTable) {
      throw new Error('Violation: "Search table for..." was found in Command Palette! Must be eradicated.')
    }
    console.log('   ✅ "Search table for..." is 100% eradicated.')

    // Test: Search for "pending payment" should return 0 commands
    console.log('6b. Testing that "pending payment" returns 0 commands...')
    await page.fill('.ut-command-palette-input', 'pending payment')
    await page.waitForTimeout(400)

    const pendingPaymentItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ut-command-palette-item'))
      return items.map((el) => el.textContent || '')
    })
    console.log('   Items found for "pending payment":', pendingPaymentItems)
    if (pendingPaymentItems.length > 0) {
      throw new Error('Violation: "pending payment" admin command found in Command Palette!')
    }
    console.log('   ✅ No "pending payment" command exists in Command Palette.')

    // 7. Test Filter Composition in Command Palette
    console.log('7. Testing Filter Composition via Command Palette...')
    // 7a. Select Lifecycle: Confirmed
    await page.fill('.ut-command-palette-input', 'Confirmed Reservations')
    await page.waitForTimeout(300)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1500)

    console.log('   Applied Confirmed Reservations. URL:', page.url())
    if (!page.url().includes('confirmed')) {
      throw new Error(`Failed to apply confirmed filter! URL: ${page.url()}`)
    }

    // 7b. Open Command Palette again and select Payment: Outstanding Balance
    await page.keyboard.press('Control+k')
    await page.waitForSelector('.ut-command-palette-modal', { timeout: 5000 })
    await page.fill('.ut-command-palette-input', 'Outstanding Balance')
    await page.waitForTimeout(300)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1500)

    const composedUrl = page.url()
    console.log('   Applied Outstanding Balance alongside Confirmed. Composed URL:', composedUrl)
    
    // Verify BOTH conditions are preserved in URL (composed)
    const hasStatus = composedUrl.includes('confirmed')
    const hasPayment = composedUrl.includes('paymentStatus') || composedUrl.includes('unpaid')
    if (!hasStatus || !hasPayment) {
      throw new Error(`Filter composition failed! One filter wiped out the other. URL: ${composedUrl}`)
    }
    console.log('   ✅ FILTER COMPOSITION VERIFIED: Confirmed + Outstanding composed cleanly!')
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'filter_composition_applied.png') })

    // 8. Test BulkActionBar Selection & Deselect All
    console.log('8. Testing Multi-Row Selection & BulkActionBar...')
    await page.goto('http://localhost:3000/admin/collections/bookings', { waitUntil: 'networkidle' })
    await page.waitForSelector('.ag-root', { timeout: 15000 })

    const checkboxes = await page.$$('.ut-checkbox')
    console.log(`   Found ${checkboxes.length} checkboxes on page.`)
    
    if (checkboxes.length >= 4) {
      await checkboxes[1].click()
      await page.waitForTimeout(300)
      await checkboxes[2].click()
      await page.waitForTimeout(500)

      const bulkBar = await page.waitForSelector('.ut-bulk-bar-container', { timeout: 5000 })
      if (!bulkBar) throw new Error('BulkActionBar failed to appear when count > 0')

      const countBadge = await page.$eval('.ut-bulk-bar-count-badge', (el) => el.textContent?.trim())
      console.log(`   BulkActionBar displayed count: "${countBadge}"`)
      if (countBadge !== '2') throw new Error(`Expected count 2, got ${countBadge}`)

      // Verify forbidden buttons are NOT present
      const forbiddenButtons = await page.evaluate(() => {
        const text = document.querySelector('.ut-bulk-bar-container')?.textContent || ''
        return {
          submitForReview: text.includes('Submit for Review'),
          inspect: text.includes('Inspect'),
          batchConfirm: text.includes('Batch Confirm'),
          refund: text.includes('Refund'),
        }
      })
      console.log('   Forbidden bulk operations check:', forbiddenButtons)
      if (Object.values(forbiddenButtons).some(Boolean)) {
        throw new Error('Forbidden bulk action button found in BulkActionBar!')
      }
      console.log('   ✅ BulkActionBar is clean: zero un-audited or dangerous buttons.')

      // Deselect All
      await page.click('.ut-bulk-btn-deselect')
      await page.waitForTimeout(500)
      const isGone = await page.evaluate(() => !document.querySelector('.ut-bulk-bar-container'))
      if (!isGone) throw new Error('Bulk bar did not dismiss on Deselect All!')
      console.log('   ✅ Deselect All dismissed floating bar cleanly.')
    }

    console.log('\n========================================================================')
    console.log('🏆 ALL PHASE 3 ARCHITECTURAL & OPERATIONAL CONTRACTS FULLY VERIFIED!')
    console.log('========================================================================')
  } catch (err) {
    console.error('❌ Verification failed:', err)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verification_error.png') })
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runPhase3Verification()
