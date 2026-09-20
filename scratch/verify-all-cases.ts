import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'd6cc14bbcffa29b19dcd1a26'
process.env.VITEST = 'true'

async function runComprehensiveVerification() {
  console.log('================================================================================')
  console.log('🧪 ACCOMMODATION SSR & BOUNDARY COMPREHENSIVE VERIFICATION SUITE')
  console.log('================================================================================\n')

  const { ExperienceDetailsLoader } = await import('../src/application/experience/loaders-details')
  const { AccommodationParamsParser } = await import('../src/application/shared/parsers/accommodation-params-parser')
  const { getApplicationServices } = await import('../src/application/factory')

  const { experience } = await getApplicationServices()

  // ---------------------------------------------------------------------------
  // TEST A: Experience #1952 (Single Option per Stay) - No query
  // ---------------------------------------------------------------------------
  console.log('--- TEST A: Experience #1952 (Single Option per Stay) ---')
  const data1952 = await ExperienceDetailsLoader.loadBySlug(
    'royal-upper-egypt-heritage-winter-palace-sonesta-6d',
    { locale: 'en', currency: 'EGP', adults: 2 }
  )
  if (!data1952) throw new Error('Test A Failed: Experience #1952 not found')
  console.log(`Title: "${data1952.title}"`)
  console.log(`Stays count: ${data1952.accommodations?.length}`)
  console.log(`Pricing is resolved: ${data1952.pricing !== null}`)
  console.log(`UnitPrice: ${data1952.pricing?.unitPrice?.formatted}`)
  console.log(`TotalPrice: ${data1952.pricing?.totalPrice?.formatted}`)
  console.log(`Auto-selected accommodations:`, data1952.pricing?.selectedAccommodationOptions)
  
  if (data1952.pricing === null) {
    throw new Error('Test A Failed: Pricing should be auto-selected for single-option package!')
  }
  if (!data1952.pricing.selectedAccommodationOptions?.[1]) {
    throw new Error('Test A Failed: Missing auto-selected option for Stay 1!')
  }
  console.log('✅ TEST A PASSED: Single option auto-selected deterministically.\n')

  // ---------------------------------------------------------------------------
  // TEST B: Experience #1955 (Multi-Option Stay) - Initial Load (No selection)
  // ---------------------------------------------------------------------------
  console.log('--- TEST B: Experience #1955 (Multi-Option Stay) - Initial Browsing (No selection) ---')
  const data1955Initial = await ExperienceDetailsLoader.loadBySlug(
    'transcontinental-grand-horizon-cairo-dubai-paris-11d',
    { locale: 'en', currency: 'EGP', adults: 2 }
  )
  if (!data1955Initial) throw new Error('Test B Failed: Experience #1955 not found')
  console.log(`Title: "${data1955Initial.title}"`)
  console.log(`Stays count: ${data1955Initial.accommodations?.length}`)
  const stay1 = data1955Initial.accommodations?.[0]
  console.log(`Stay 1 options count: ${stay1?.options.length}`)
  stay1?.options.forEach((opt, idx) => {
    console.log(`  Alternative Option #${idx + 1}: ID="${opt.id}", Name="${opt.propertyName}"`)
  })
  console.log(`Pricing state:`, data1955Initial.pricing)
  
  if (stay1?.options.length !== 2) {
    throw new Error(`Test B Failed: Stay 1 must contain 2 options, found ${stay1?.options.length}`)
  }
  if (data1955Initial.pricing !== null) {
    throw new Error('Test B Failed: Pricing MUST be null on initial browsing when multi-option stay has no selection! (Never invent a fallback!)')
  }
  console.log('✅ TEST B PASSED: Initial load returns pricing=null, preserves both alternatives without fake selection.\n')

  // ---------------------------------------------------------------------------
  // TEST C: Experience #1955 - With Valid URL Selection
  // ---------------------------------------------------------------------------
  console.log('--- TEST C: Experience #1955 - With Valid Explicit Selection (Option 1: George V) ---')
  const validOptId = '6aaee7a51b85d681a43b3979' // Four Seasons George V
  const urlParam = `1:${validOptId}`
  const parsedSelection = AccommodationParamsParser.parse(urlParam)
  console.log('Parsed selection from URL:', parsedSelection)

  const data1955Valid = await ExperienceDetailsLoader.loadBySlug(
    'transcontinental-grand-horizon-cairo-dubai-paris-11d',
    { locale: 'en', currency: 'EGP', adults: 2, selectedAccommodationOptions: parsedSelection }
  )
  if (!data1955Valid) throw new Error('Test C Failed: Experience #1955 not found')
  console.log(`Pricing is resolved: ${data1955Valid.pricing !== null}`)
  console.log(`UnitPrice: ${data1955Valid.pricing?.unitPrice?.formatted}`)
  console.log(`TotalPrice: ${data1955Valid.pricing?.totalPrice?.formatted}`)
  console.log(`Resolved selectedAccommodationOptions:`, data1955Valid.pricing?.selectedAccommodationOptions)
  
  if (data1955Valid.pricing === null) {
    throw new Error('Test C Failed: Pricing should be resolved when valid explicit selection is supplied!')
  }
  if (data1955Valid.pricing.selectedAccommodationOptions?.[1] !== validOptId) {
    throw new Error(`Test C Failed: Selected option ID mismatch! Expected ${validOptId}, got ${data1955Valid.pricing.selectedAccommodationOptions?.[1]}`)
  }
  console.log('✅ TEST C PASSED: Valid explicit selection resolved exact option and calculated price.\n')

  // ---------------------------------------------------------------------------
  // TEST D: Experience #1955 - With Invalid Selection
  // ---------------------------------------------------------------------------
  console.log('--- TEST D: Experience #1955 - With Invalid Selection (Option from another stay) ---')
  // Option '6aaee7a51b85d681a43b3984' belongs to Stay #2, NOT Stay #1
  const invalidOptId = '6aaee7a51b85d681a43b3984'
  const invalidUrlParam = `1:${invalidOptId}`
  const parsedInvalid = AccommodationParamsParser.parse(invalidUrlParam)
  console.log('Parsed invalid selection from URL:', parsedInvalid)

  const data1955Invalid = await ExperienceDetailsLoader.loadBySlug(
    'transcontinental-grand-horizon-cairo-dubai-paris-11d',
    { locale: 'en', currency: 'EGP', adults: 2, selectedAccommodationOptions: parsedInvalid }
  )
  if (!data1955Invalid) throw new Error('Test D Failed: Experience #1955 not found')
  console.log(`Pricing state for invalid selection:`, data1955Invalid.pricing)
  
  if (data1955Invalid.pricing !== null) {
    throw new Error('Test D Failed: Invalid option selection must be rejected, keeping pricing=null!')
  }
  console.log('✅ TEST D PASSED: Invalid option rejected, no fallback, pricing remains null.\n')

  // ---------------------------------------------------------------------------
  // TEST F: Genuine Pricing Failure (Error Must NOT be swallowed)
  // ---------------------------------------------------------------------------
  console.log('--- TEST F: Genuine Pricing Failure (Must NOT be swallowed into pricing=null) ---')
  // Test with non-existent slotId in bookingPricingUseCase
  const { bookingPricingUseCase } = await getApplicationServices()
  const ctx = {
    cookieLocale: 'en',
    cookieCurrency: 'EGP',
    displayCurrency: 'EGP',
    exchangeRate: 1,
    locale: 'en' as const,
  }

  let threwGenuineError = false
  try {
    await bookingPricingUseCase.calculate({
      experienceId: 1955,
      slotId: 999999999, // genuinely non-existent slot ID
      adultsCount: 2,
      childrenCount: 0,
      selectedAccommodationOptions: { 1: validOptId },
      ctx,
    })
  } catch (err: any) {
    threwGenuineError = true
    console.log(`Caught expected genuine pricing exception: "${err.message}"`)
  }

  if (!threwGenuineError) {
    throw new Error('Test F Failed: Genuine pricing failure did not throw!')
  }
  console.log('✅ TEST F PASSED: Genuine pricing failures throw normally and are never swallowed.\n')

  console.log('================================================================================')
  console.log('🎉 ALL TESTS PASSED WITH 100% ARCHITECTURAL COHERENCE!')
  console.log('================================================================================')
}

runComprehensiveVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})
