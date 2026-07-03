import { getPayload } from 'payload'
import config from '@payload-config'
import type { CurrencyCode } from '@/types'

/**
 * Seed database with initial data
 */
async function seed() {
  const payload = await getPayload({ config })

  console.log('🌱 Starting seed...')

  // 1. Seed Exchange Rates
  console.log('💱 Seeding exchange rates...')
  const rates = [
    { from: 'EGP', to: 'USD', rate: 0.032 },
    { from: 'EGP', to: 'EUR', rate: 0.03 },
    { from: 'EGP', to: 'AED', rate: 0.12 },
    { from: 'EGP', to: 'SAR', rate: 0.12 },
    { from: 'EGP', to: 'EGP', rate: 1 },
  ]

  for (const rate of rates) {
    await payload.create({
      collection: 'exchange-rates',
      data: {
        fromCurrency: rate.from,
        toCurrency: rate.to,
        rate: rate.rate,
        source: 'Manual',
        syncStatus: 'synced',
        lastUpdate: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
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
  console.log('🌴 Seeding experiences...')
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

  // 5. Create Admin User (Staff)
  console.log('👤 Creating admin user...')
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@laubevoyage.com',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
    },
  })

  // 6. Create Customer (Traveler)
  console.log('👤 Creating customer traveler...')
  await payload.create({
    collection: 'customers',
    data: {
      email: 'customer@laubevoyage.com',
      password: 'Customer@123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      status: 'active',
      _verified: true,
      loyalty: {
        tier: 'explorer',
        points: 100, // starts with welcome bonus
        totalSpent: 0,
      },
    },
  })

  console.log('✅ Seed completed successfully!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
