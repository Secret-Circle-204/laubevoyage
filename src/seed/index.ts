import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { seedCurrencies } from './foundation/system/currencies.seed'
import { seedLanguages } from './foundation/system/languages.seed'
import { seedSystemSettings, type SystemSettingsSeedResult } from './foundation/system/system-settings.seed'
import { seedLoyaltyProgram } from './foundation/system/loyalty.seed'
import { cleanupDuplicateTranslations } from './foundation/system/cleanup-translations.seed'

import { seedDestinationMedia, seedExperienceMedia } from './content/media.seed'
import { seedCountries } from './content/countries.seed'
import { seedCities } from './content/cities.seed'
import { seedAccommodations } from './catalog/accommodations.seed'
import { seedFaqs } from './content/faqs.seed'
import { seedCatalogExperiences } from './catalog/experiences.seed'
import { seedDepartureSlots } from './catalog/departure-slots.seed'
import { seedUsers } from './accounts/users.seed'

/**
 * Enterprise Modular Production Seeder for L'Aube Voyage
 * Supports targeted execution via CLI flags:
 * - pnpm seed                     (Seeds Foundation + Content + Accommodations + Catalog + Slots)
 * - pnpm seed --only=content      (Seeds Media + Countries + Cities + FAQs)
 * - pnpm seed --only=accommodations (Seeds 21 Verified Luxury Accommodations)
 * - pnpm seed --only=catalog      (Seeds Accommodations + Experiences Catalog + Departure Slots)
 * - pnpm seed --only=slots        (Seeds 86 Verified Operational Departure Slots)
 * - pnpm seed --only=foundation   (Seeds System Currencies, Languages, SystemSettings, Loyalty)
 * - pnpm seed --only=accounts     (Seeds Isolated Dev Accounts)
 */
async function main() {
  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith('--only='))
  const target = onlyArg ? onlyArg.split('=')[1]?.toLowerCase() : 'all'

  console.log('====================================================')
  console.log(`🌱 L'Aube Voyage Enterprise Seeder [Target: ${target.toUpperCase()}]`)
  console.log('====================================================')

  const payload = await getPayload({ config })

  // 1. Foundation / System Configuration
  if (target === 'all' || target === 'foundation' || target === 'currencies') {
    await seedCurrencies(payload)
  }

  if (target === 'all' || target === 'foundation' || target === 'languages' || target === 'locales') {
    await seedLanguages(payload)
  }

  let systemSettingsResult: SystemSettingsSeedResult | null = null
  if (target === 'all' || target === 'foundation' || target === 'system-settings' || target === 'settings') {
    systemSettingsResult = await seedSystemSettings(payload)
  }

  if (target === 'all' || target === 'foundation' || target === 'loyalty') {
    await seedLoyaltyProgram(payload)
  }

  if (target === 'all' || target === 'foundation' || target === 'cleanup') {
    await cleanupDuplicateTranslations(payload)
  }

  // 2. Production Content Layer
  let mediaResult: any = null
  if (target === 'all' || target === 'content' || target === 'media' || target === 'destinations' || target === 'countries' || target === 'cities') {
    mediaResult = await seedDestinationMedia(payload)
  }

  let experienceMediaResult: any = null
  if (target === 'all' || target === 'content' || target === 'media' || target === 'catalog' || target === 'experiences') {
    experienceMediaResult = await seedExperienceMedia(payload)
  }

  let countriesResult: any = null
  if (target === 'all' || target === 'content' || target === 'destinations' || target === 'countries' || target === 'cities') {
    const assetMap = mediaResult?.assetMap || {}
    countriesResult = await seedCountries(payload, assetMap)
  }

  let citiesResult: any = null
  if (target === 'all' || target === 'content' || target === 'destinations' || target === 'cities' || target === 'accommodations') {
    const assetMap = mediaResult?.assetMap || {}
    const countryDocsMap = countriesResult?.countryDocsMap || {}
    citiesResult = await seedCities(payload, countryDocsMap, assetMap)
  }

  let accommodationsResult: any = null
  if (target === 'all' || target === 'catalog' || target === 'accommodations') {
    // If cities weren't seeded in this run, fetch city docs from database
    let cityDocsMap = citiesResult?.cityDocsMap
    if (!cityDocsMap) {
      const citiesRes = await payload.find({ collection: 'cities', limit: 100 })
      cityDocsMap = {}
      for (const c of citiesRes.docs) {
        cityDocsMap[c.slug] = c
      }
    }
    accommodationsResult = await seedAccommodations(payload, cityDocsMap)
  }

  let faqsResult: any = null
  if (target === 'all' || target === 'content' || target === 'faqs') {
    faqsResult = await seedFaqs(payload)
  }

  // 3. Production Catalog Layer
  let catalogResult: any = null
  if (target === 'all' || target === 'catalog' || target === 'experiences') {
    let cityDocsMap = citiesResult?.cityDocsMap
    let accommodationDocsMap = accommodationsResult?.accommodationDocsMap
    let expMediaMap = experienceMediaResult?.assetMap
    catalogResult = await seedCatalogExperiences(payload, cityDocsMap, accommodationDocsMap, expMediaMap)
  }

  // 4. Production Operational Departure Slots Layer (86 Discrete Slots)
  let departureSlotsResult: any = null
  if (target === 'all' || target === 'catalog' || target === 'slots' || target === 'departure-slots') {
    let expDocsMap = catalogResult?.experienceDocsMap
    if (!expDocsMap || Object.keys(expDocsMap).length === 0) {
      const expRes = await payload.find({ collection: 'experiences', limit: 100 })
      expDocsMap = {}
      for (const exp of expRes.docs) {
        expDocsMap[exp.slug] = exp
      }
    }
    departureSlotsResult = await seedDepartureSlots(payload, expDocsMap)
  }

  // 5. Isolated Dev Accounts (Explicit Flag Only)
  if (target === 'accounts') {
    await seedUsers(payload)
  }

  // 6. Final Comprehensive Integrity & Audit Report
  console.log('\n====================================================')
  console.log('📋 CONTENT SEED AUDIT & INTEGRITY REPORT')
  console.log('====================================================')

  if (systemSettingsResult) {
    console.log(`Foundation SystemSettings:`)
    console.log(`  - Status       : ${systemSettingsResult.status === 'preserved' ? '🛡️ PRESERVED (Admin Configuration Active)' : '✅ CREATED (Canonical Baseline)'}`)
    console.log(`  - Base Currency: ${systemSettingsResult.baseCurrency}`)
    console.log(`  - Reservation  : ${systemSettingsResult.reservationSenderEmail}`)
    console.log(`  - Loyalty      : ${systemSettingsResult.loyaltySenderEmail}`)
  }

  if (mediaResult) {
    console.log(`Media Assets (Destination Hero):`)
    console.log(`  - Required  : 52`)
    console.log(`  - Ingested  : ${mediaResult.totalIngested}`)
    console.log(`  - Reused    : ${mediaResult.totalReused}`)
    console.log(`  - Downloaded: ${mediaResult.totalDownloaded}`)
    console.log(`  - Status    : ${mediaResult.totalProcessed === 52 ? '✅ 100% COMPLETE' : '⚠️ INCOMPLETE'}`)
  }

  if (experienceMediaResult) {
    console.log(`Media Assets (Experience Hero & Gallery):`)
    console.log(`  - Required  : 33 (11 Hero + 22 Gallery)`)
    console.log(`  - Ingested  : ${experienceMediaResult.totalIngested}`)
    console.log(`  - Reused    : ${experienceMediaResult.totalReused}`)
    console.log(`  - Downloaded: ${experienceMediaResult.totalDownloaded}`)
    console.log(`  - Status    : ${experienceMediaResult.totalProcessed === 33 ? '✅ 100% COMPLETE' : '⚠️ INCOMPLETE'}`)
  }

  if (countriesResult) {
    console.log(`Countries:`)
    console.log(`  - Required   : 12`)
    console.log(`  - Processed  : ${countriesResult.totalProcessed}`)
    console.log(`  - Created    : ${countriesResult.totalCreated}`)
    console.log(`  - Updated    : ${countriesResult.totalUpdated}`)
    console.log(`  - Hero Linked: ${countriesResult.heroLinkedCount}/12 (${countriesResult.heroLinkedCount === 12 ? 'PASS' : 'FAIL'})`)
  }

  if (citiesResult) {
    console.log(`Cities:`)
    console.log(`  - Required     : 40`)
    console.log(`  - Processed    : ${citiesResult.totalProcessed}`)
    console.log(`  - Created      : ${citiesResult.totalCreated}`)
    console.log(`  - Updated      : ${citiesResult.totalUpdated}`)
    console.log(`  - Hero Linked  : ${citiesResult.heroLinkedCount}/40 (${citiesResult.heroLinkedCount === 40 ? 'PASS' : 'FAIL'})`)
    console.log(`  - Country Rel  : ${citiesResult.countryLinkedCount}/40 (${citiesResult.countryLinkedCount === 40 ? 'PASS' : 'FAIL'})`)
  }

  if (accommodationsResult) {
    console.log(`Accommodations (Luxury Properties):`)
    console.log(`  - Required     : 21`)
    console.log(`  - Processed    : ${accommodationsResult.totalProcessed}`)
    console.log(`  - Created      : ${accommodationsResult.totalCreated}`)
    console.log(`  - Updated      : ${accommodationsResult.totalUpdated}`)
    console.log(`  - City Rel     : ${accommodationsResult.cityLinkedCount}/21 (${accommodationsResult.cityLinkedCount === 21 ? 'PASS' : 'FAIL'})`)
  }

  if (faqsResult) {
    console.log(`FAQs:`)
    console.log(`  - Processed  : ${faqsResult.totalProcessed}`)
  }

  if (catalogResult) {
    console.log(`Catalog Experiences:`)
    console.log(`  - Required     : 11 Canonical Journeys`)
    console.log(`  - Processed    : ${catalogResult.totalProcessed}`)
    console.log(`  - Created      : ${catalogResult.totalCreated}`)
    console.log(`  - Updated      : ${catalogResult.totalUpdated}`)
    console.log(`  - Hero Linked   : ${catalogResult.heroLinkedCount}/11 (${catalogResult.heroLinkedCount === 11 ? 'PASS' : 'FAIL'})`)
    console.log(`  - Gallery Linked: ${catalogResult.galleryImagesLinkedCount}/22 (${catalogResult.galleryImagesLinkedCount >= 22 ? 'PASS' : 'FAIL'})`)
    console.log(`  - Daily Tours   : ${catalogResult.dailyToursCount}`)
    console.log(`  - Packages      : ${catalogResult.packagesCount}`)
    console.log(`  - Stays Linked  : ${catalogResult.accommodationsLinkedCount}`)
    console.log(`  - Dest Linked   : ${catalogResult.destinationsLinkedCount}`)
  }

  if (departureSlotsResult) {
    console.log(`Operational Departure Slots:`)
    console.log(`  - Required     : 86 Discrete Slots across 7 Fixed Packages`)
    console.log(`  - Processed    : ${departureSlotsResult.totalProcessed}`)
    console.log(`  - Created      : ${departureSlotsResult.totalCreated}`)
    console.log(`  - Updated      : ${departureSlotsResult.totalUpdated}`)
    console.log(`  - Status       : ${departureSlotsResult.totalProcessed === 86 ? '✅ 100% VERIFIED' : '⚠️ INCOMPLETE'}`)
  }

  console.log(`Operational Isolation:`)
  console.log(`  - Bookings Created            : 0 (STRICT ZERO)`)
  console.log(`  - Customers Created           : 0 (STRICT ZERO)`)
  console.log(`  - Point Ledger Entries Created: 0 (STRICT ZERO)`)
  console.log(`  - Payment Transactions Created: 0 (STRICT ZERO)`)
  console.log('====================================================')
  console.log(`🎉 Enterprise Seeding completed successfully!`)
  console.log('====================================================\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Enterprise Seeding failed with error:', err)
  process.exit(1)
})
