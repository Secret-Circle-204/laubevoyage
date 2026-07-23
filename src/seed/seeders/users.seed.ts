import type { Payload } from 'payload'

export async function seedUsers(payload: Payload): Promise<void> {
  console.log('👤 [Seed] Seeding Users (Admin Staff & Customer Travelers)...')

  // 1. Admin Staff User (users collection - Payload CMS Admin Access)
  try {
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@laubevoyage.com',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Admin',
        role: 'super_admin',
      },
    })
    console.log('   ✅ Created Admin Staff: admin@laubevoyage.com / Admin@123')
  } catch {
    console.log('   ⚠️ Admin staff account already exists.')
  }

  // 2. Customer Traveler (customers collection - Frontend Customer Account & Loyalty Ledger)
  try {
    await payload.create({
      collection: 'customers',
      data: {
        email: 'customer@laubevoyage.com',
        password: 'Customer@123',
        firstName: 'Alexander',
        lastName: 'Wright',
        phone: '+201000000000',
        status: 'active',
        _verified: true,
        loyalty: {
          tier: 'explorer',
          points: 100, // Starts with welcome bonus
          totalSpent: 0,
        },
      },
    })
    console.log('   ✅ Created Customer Traveler: customer@laubevoyage.com / Customer@123')
  } catch {
    console.log('   ⚠️ Customer traveler account already exists.')
  }
}
