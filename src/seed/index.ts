import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { seedCurrencies } from './seeders/currencies.seed'
import { seedLocales } from './seeders/locales.seed'
import { seedUsers } from './seeders/users.seed'
import { seedDestinations } from './seeders/destinations.seed'
import { seedExperiences } from './seeders/experiences.seed'
import { seedFaqs } from './seeders/faqs.seed'
import { cleanupDuplicateTranslations } from './seeders/cleanup-translations.seed'

/**
 * Master Enterprise Modular Database Seeder for L'Aube Voyage
 * Supports running all seeders at once or targeting individual modules via CLI flags:
 * - pnpm seed                     (Seeds everything)
 * - pnpm seed --only=currencies   (Seeds Currencies Catalog only)
 * - pnpm seed --only=locales      (Seeds Languages Catalog only)
 * - pnpm seed --only=users        (Seeds Users & Customers only)
 * - pnpm seed --only=destinations (Seeds Countries & Cities only)
 * - pnpm seed --only=experiences  (Seeds Packages & Daily Tours only)
 * - pnpm seed --only=faqs         (Seeds FAQs only)
 */
async function seed() {
  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith('--only='))
  const target = onlyArg ? onlyArg.split('=')[1]?.toLowerCase() : 'all'

  console.log(`🌱 Enterprise Seeder initialized [Target Module: ${target.toUpperCase()}]`)
  console.log('====================================================')

  const payload = await getPayload({ config })

  if (target === 'all' || target === 'currencies') {
    await seedCurrencies(payload)
  }

  if (target === 'all' || target === 'locales') {
    await seedLocales(payload)
  }

  if (target === 'all' || target === 'users') {
    await seedUsers(payload)
  }

  let destinations: any = null
  if (target === 'all' || target === 'destinations' || target === 'experiences') {
    destinations = await seedDestinations(payload)
  }

  if (target === 'all' || target === 'experiences') {
    await seedExperiences(payload, destinations)
  }

  if (target === 'all' || target === 'faqs') {
    await seedFaqs(payload)
  }

  if (target === 'all' || target === 'cleanup') {
    await cleanupDuplicateTranslations(payload)
  }

  console.log('====================================================')
  console.log(`🎉 Enterprise Seeding for [${target.toUpperCase()}] completed successfully!`)
  if (target === 'all' || target === 'users') {
    console.log('----------------------------------------------------')
    console.log('🔑 Admin Credentials  : admin@laubevoyage.com / Admin@123')
    console.log('👤 Customer Credentials: customer@laubevoyage.com / Customer@123')
    console.log('----------------------------------------------------')
  }
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Enterprise Seed failed:', error)
  process.exit(1)
})
