import { chromium } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/2834f54a-d82c-468b-b92f-5250484a8f92'

async function testMultiFields() {
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

  // Open Bulk Edit Modal
  const editBtn = await page.$('.ut-bulk-edit-container .edit-many .list-selection__button')
  if (editBtn) await editBtn.click()
  await page.waitForTimeout(1000)

  // Select "Title"
  let fieldSelect = await page.$('.field-select .rs__control')
  if (fieldSelect) await fieldSelect.click()
  await page.waitForTimeout(400)
  let opt = await page.$('.rs__option:has-text("Title")')
  if (opt) await opt.click()
  await page.waitForTimeout(600)

  // Select "City"
  fieldSelect = await page.$('.field-select .rs__control')
  if (fieldSelect) await fieldSelect.click()
  await page.waitForTimeout(400)
  opt = await page.$('.rs__option:has-text("City")')
  if (opt) await opt.click()
  await page.waitForTimeout(600)

  // Select "Destinations"
  fieldSelect = await page.$('.field-select .rs__control')
  if (fieldSelect) await fieldSelect.click()
  await page.waitForTimeout(400)
  opt = await page.$('.rs__option:has-text("Destinations")')
  if (opt) await opt.click()
  await page.waitForTimeout(600)

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'centered_modal_three_fields.png') })
  await browser.close()
}

testMultiFields().catch(console.error)
