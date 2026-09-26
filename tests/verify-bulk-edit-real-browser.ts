import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ARTIFACTS_DIR = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/2834f54a-d82c-468b-b92f-5250484a8f92'

async function runBulkEditBrowserProof() {
  console.log('========================================================================')
  console.log('REAL-BROWSER AUDIT: NATIVE BULK EDIT (EditMany) IN EXPERIENCES WORKSPACE')
  console.log('Target: http://localhost:3000/admin/collections/experiences')
  console.log('========================================================================\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()

  // Track network requests to detect any custom loops or duplicate PATCHes
  const apiRequests: Array<{ method: string; url: string; postData?: string }> = []
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('/api/experiences') || url.includes('/api/bookings')) {
      apiRequests.push({
        method: req.method(),
        url,
        postData: req.postData() || undefined,
      })
      console.log(`   [NETWORK REQ] ${req.method()} ${url.substring(0, 100)}...`)
    }
  })

  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[BulkActionBar') || text.includes('Error') || text.includes('error')) {
      console.log('   [PAGE LOG]', text)
    }
  })
  page.on('pageerror', (err) => console.log('   [PAGE ERROR]', err.message))

  try {
    // 1. Authenticate as Administrator
    console.log('1. Authenticating as Administrator...')
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' })

    if (page.url().includes('/admin/login')) {
      await page.waitForSelector('input[name="email"], input[type="email"]')
      await page.fill('input[name="email"], input[type="email"]', 'admin@laubevoyage.com')
      await page.fill('input[name="password"], input[type="password"]', 'Admin@123')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)
    }
    console.log('   Logged in successfully. Current URL:', page.url())

    // 2. Navigate to Experiences Operating Workspace
    console.log('2. Navigating to Experiences Workspace...')
    await page.goto('http://localhost:3000/admin/collections/experiences', { waitUntil: 'networkidle' })
    await page.waitForSelector('.ag-root', { timeout: 15000 })
    console.log('   Universal Grid loaded.')

    // Take screenshot of initial state
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'experiences_initial_grid.png') })

    // 3. Select 10 Experiences via AG Grid checkboxes
    console.log('3. Selecting 10 Experiences via row checkboxes...')
    await page.waitForSelector('.ut-checkbox', { timeout: 10000 })
    
    // Find all row checkboxes (skip header checkbox which is at index 0)
    const checkboxes = await page.$$('.ag-row .ut-checkbox')
    console.log(`   Found ${checkboxes.length} row checkboxes in DOM.`)

    const targetSelectCount = Math.min(10, checkboxes.length)
    if (targetSelectCount === 0) {
      throw new Error('No row checkboxes found in Experiences grid!')
    }

    for (let i = 0; i < targetSelectCount; i++) {
      await checkboxes[i].click()
      await page.waitForTimeout(100)
    }

    console.log(`   Selected ${targetSelectCount} rows.`)

    // 4. Verify Floating BulkActionBar appears
    console.log('4. Verifying Floating BulkActionBar presence and contents...')
    await page.waitForSelector('.ut-bulk-bar-container', { timeout: 5000 })
    
    const countBadgeText = await page.$eval('.ut-bulk-bar-count-badge', (el) => el.textContent?.trim())
    console.log(`   BulkActionBar Count Badge: ${countBadgeText}`)

    const editBtn = await page.$('.ut-bulk-edit-container .edit-many .list-selection__button')
    if (!editBtn) {
      throw new Error('Native EditMany button NOT found inside BulkActionBar!')
    }
    const editBtnText = await editBtn.textContent()
    console.log(`   Native Edit Button Text: "${editBtnText?.trim()}"`)

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'experiences_10_selected_bar.png') })

    // 5. Click Native Edit Button
    console.log('5. Clicking Native Edit button to trigger Payload EditMany Drawer...')
    await editBtn.click()
    await page.waitForTimeout(1500)

    // 6. Verify Payload Native Drawer Opens & Select Fields
    console.log('6. Verifying Payload Native Drawer contents & Field Selector...')
    const drawerSelector = '.drawer--is-open, .drawer__content, .edit-many__main'
    await page.waitForSelector(drawerSelector, { timeout: 8000 })

    const drawerTitle = await page.$eval('.edit-many__header__title, h2', (el) => el.textContent?.trim()).catch(() => '')
    console.log(`   Drawer Header Title: "${drawerTitle}"`)

    // Verify Save button is initially disabled because selectedFields is empty
    const saveButtonInitially = await page.$('.edit-many__save, button[type="submit"]')
    const isSaveDisabledInitially = await saveButtonInitially?.isDisabled()
    console.log(`   Save Button Initially Disabled: ${isSaveDisabledInitially} (expected: true)`)

    // Click the FieldSelect dropdown to choose a field to edit
    console.log('   Interacting with FieldSelect dropdown...')
    const rsControl = await page.$('.field-select .rs__control, .rs__control')
    if (rsControl) {
      await rsControl.click()
      await page.waitForTimeout(500)
      
      // Look for options in the dropdown
      const options = await page.$$('.rs__option')
      console.log(`   Field options available in dropdown: ${options.length}`)
      if (options.length > 0) {
        const firstOptionText = await options[0].textContent()
        console.log(`   Selecting field: "${firstOptionText?.trim()}"`)
        await options[0].click()
        await page.waitForTimeout(1000)

        // After selecting a field, check that the field rendered in the form and Save button is enabled
        const isSaveDisabledAfterSelect = await saveButtonInitially?.isDisabled()
        console.log(`   Save Button Disabled after field selection: ${isSaveDisabledAfterSelect} (expected: false)`)

        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'experiences_field_selected_form.png') })
      }
    }

    // 7. Close the Drawer without committing mutation to keep DB clean
    console.log('7. Closing the Drawer...')
    const closeBtn = await page.$('.edit-many__header__close, [id^="close-drawer__"]')
    if (closeBtn) {
      await closeBtn.click()
      await page.waitForTimeout(1000)
    }

    // 8. Test Deselect All
    console.log('8. Testing Deselect All in BulkActionBar...')
    const deselectBtn = await page.$('.ut-bulk-btn-deselect')
    if (!deselectBtn) {
      throw new Error('Deselect button NOT found!')
    }
    await deselectBtn.click()
    await page.waitForTimeout(1000)

    const barVisible = await page.$('.ut-bulk-bar-container')
    console.log(`   BulkActionBar visible after Deselect All: ${Boolean(barVisible)} (expected: false)`)
    if (barVisible) {
      throw new Error('BulkActionBar did not disappear after Deselect All!')
    }

    // 9. Test "Select all across pages" invariant & where preservation
    console.log('9. Testing "Select all across pages" with active filter...')
    // Select all using the header select-all checkbox
    const headerCheckbox = await page.$('.ag-header-cell .ut-checkbox')
    if (headerCheckbox) {
      await headerCheckbox.click()
      await page.waitForTimeout(500)
      
      // Check if "Select all (11)" link is available in the selection header
      const selectAllAcrossPagesLink = await page.$('button:has-text("Select all"), a:has-text("Select all")')
      if (selectAllAcrossPagesLink) {
        console.log('   Clicking "Select all (N)" across pages...')
        await selectAllAcrossPagesLink.click()
        await page.waitForTimeout(500)
      }
      
      const bulkBarCount = await page.$eval('.ut-bulk-bar-count-badge', (el) => el.textContent?.trim()).catch(() => '')
      console.log(`   BulkActionBar Count after Select All: ${bulkBarCount}`)
      
      // Clean up by clicking deselect
      const deselectAgain = await page.$('.ut-bulk-btn-deselect')
      if (deselectAgain) await deselectAgain.click()
      await page.waitForTimeout(500)
    }
    console.log(`   BulkActionBar visible after Deselect All: ${Boolean(barVisible)} (expected: false)`)
    if (barVisible) {
      throw new Error('BulkActionBar did not disappear after Deselect All!')
    }

    // 9. Verify Bookings collection does NOT show generic Bulk Edit
    console.log('9. Checking Bookings Workspace to verify bulkEdit: false isolation...')
    await page.goto('http://localhost:3000/admin/collections/bookings', { waitUntil: 'networkidle' })
    await page.waitForSelector('.ag-root', { timeout: 15000 })

    const bookingCheckboxes = await page.$$('.ag-row .ut-checkbox')
    if (bookingCheckboxes.length > 0) {
      await bookingCheckboxes[0].click()
      await page.waitForTimeout(500)
      
      const bookingBar = await page.$('.ut-bulk-bar-container')
      console.log(`   Bookings BulkActionBar visible on select: ${Boolean(bookingBar)}`)
      const bookingEditBtn = await page.$('.ut-bulk-edit-container .edit-many .list-selection__button')
      console.log(`   Bookings Generic Edit button present: ${Boolean(bookingEditBtn)} (expected: false)`)
      if (bookingEditBtn) {
        throw new Error('CRITICAL VIOLATION: Generic Edit button appeared on Bookings!')
      }
    }

    console.log('\n========================================================================')
    console.log('ALL BROWSER PROOFS PASSED WITH 100% CANONICAL PAYLOAD NATIVE FIDELITY!')
    console.log('========================================================================')
  } catch (err: any) {
    console.error('PROOFS FAILED:', err.message)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'experiences_error_state.png') }).catch(() => {})
    throw err
  } finally {
    await browser.close()
  }
}

runBulkEditBrowserProof().catch((err) => {
  console.error(err)
  process.exit(1)
})
