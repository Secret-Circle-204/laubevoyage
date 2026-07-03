import { getPayload } from 'payload'
import config from '@payload-config'
import { CurrencyCode } from '@/types'

/**
 * Seed database with initial data
 */
async function seed() {
  const payload = await getPayload({ config })

  console.log('🌱 Starting seed...')

  // 1. Seed Exchange Rates
  console.log('💱 Seeding exchange rates...')
  const rates = [
    { from: CurrencyCode.EGP, to: CurrencyCode.USD, rate: 0.032 },
    { from: CurrencyCode.EGP, to: CurrencyCode.EUR, rate: 0.03 },
    { from: CurrencyCode.EGP, to: CurrencyCode.AED, rate: 0.12 },
    { from: CurrencyCode.EGP, to: CurrencyCode.SAR, rate: 0.12 },
    { from: CurrencyCode.EGP, to: CurrencyCode.EGP, rate: 1 },
  ]

  for (const rate of rates) {
    await payload.create({
      collection: 'exchange-rates',
      data: {
        fromCurrency: rate.from,
        toCurrency: rate.to,
        rate: rate.rate,
        isActive: true,
      },
    })
  }

  // 2. Seed Countries
  console.log('🌍 Seeding countries...')
  const egypt = await payload.create({
    collection: 'countries',
    data: {
      name: 'Egypt',
      slug: 'egypt',
      code: 'EG',
      isActive: true,
    },
  })

  // 3. Seed Cities
  console.log('🏙️ Seeding cities...')
  const cairo = await payload.create({
    collection: 'cities',
    data: {
      name: 'Cairo',
      slug: 'cairo',
      country: egypt.id,
      isActive: true,
    },
  })

  // 4. Seed Experiences
  console.log(' Seeding experiences...')
  await payload.create({
    collection: 'experiences',
    data: {
      title: 'Cairo & Pyramids - 3 Days Package',
      slug: 'cairo-pyramids-3-days',
      type: 'package',
      city: cairo.id,
      duration: {
        days: 3,
        nights: 2,
      },
      price: 15000,
      availability: 'available',
      included: [{ item: 'Hotel accommodation' }],
      excluded: [{ item: 'International flights' }],
      isActive: true,
    },
  })

  // 5. Create Admin User
  // console.log('👤 Creating admin user...')
  // await payload.create({
  //   collection: 'users',
  //   data: {
  //     email: 'admin@laubevoyage.com',
  //     password: 'Admin@123',
  //     firstName: 'Admin',
  //     lastName: 'User',
  //     role: 'super_admin',
  //     status: 'active',
  //     loyalty: {
  //       tier: 'elite',
  //       points: 0,
  //       totalSpent: 0,
  //     },
  //   },
  // })

  console.log('✅ Seed completed successfully!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
