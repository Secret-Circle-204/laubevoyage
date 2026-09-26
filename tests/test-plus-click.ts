import { chromium } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/2834f54a-d82c-468b-b92f-5250484a8f92'

async function testCenteredModal() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  
  await page.goto('http://localhost:3000/admin/login')
  await page.fill('input[name="email"], input[type="email"]', 'admin@laubevoyage.com')
  await page.fill('input[name="password"], input[type="password"]', 'Admin@123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)

  await page.goto('http://localhost:3000/admin/collections/experiences')
  await page.waitForSelector('.ag-root')
  
  const checkbox = await page.$('.ag-row .ut-checkbox')
  if (checkbox) await checkbox.click()
  await page.waitForTimeout(500)

  // 1. Open Bulk Edit Modal
  const editBtn = await page.$('.ut-bulk-edit-container .edit-many .list-selection__button')
  if (editBtn) await editBtn.click()
  await page.waitForTimeout(1000)

  // 2. Select "City" in FieldSelect
  const fieldSelect = await page.$('.field-select .rs__control')
  if (fieldSelect) await fieldSelect.click()
  await page.waitForTimeout(500)

  const cityOpt = await page.$('.rs__option:has-text("City")')
  if (cityOpt) await cityOpt.click()
  await page.waitForTimeout(1000)

  // 3. Inspect Save button geometry in centered modal
  const saveInfo = await page.evaluate(() => {
    const saveBtn = document.querySelector('.edit-many__save, button.form-submit')
    const wrap = document.querySelector('.edit-many__sidebar-wrap')
    const modal = document.querySelector('dialog[id^="ut-bulk-edit"] .drawer__content')
    return {
      saveBtn: saveBtn ? saveBtn.getBoundingClientRect() : null,
      wrap: wrap ? wrap.getBoundingClientRect() : null,
      modal: modal ? modal.getBoundingClientRect() : null,
    }
  })
  console.log('GEOMETRY:', JSON.stringify(saveInfo, null, 2))

  // 4. Capture Screenshot 1: Centered Modal with City selected
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'centered_modal_city_closed.png') })

  // 5. Open City Dropdown to verify menu visibility & layer ordering
  const citySelectControl = await page.$('.render-fields .relationship .rs__control')
  if (citySelectControl) {
    await citySelectControl.click()
    await page.waitForTimeout(800)
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'centered_modal_city_dropdown_open.png') })

  // 6. Click '+' button to test nested sub-drawer stacking
  console.log('Clicking the + button in City...')
  const plusBtn = await page.$('.relationship button.relationship-add-new__add-button, button.relationship-add-new__add-button, .relationship-add-new button')
  if (plusBtn) {
    await plusBtn.click()
    await page.waitForTimeout(2000)
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'centered_modal_plus_drawer_on_top.png') })

  await browser.close()
}

testCenteredModal().catch((err) => {
  console.error(err)
  process.exit(1)
})
