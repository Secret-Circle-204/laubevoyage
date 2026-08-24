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
  let customerDoc: any = null
  try {
    customerDoc = await payload.create({
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
    console.log('   ⚠️ Customer traveler account already exists. Finding document...')
    const existing = await payload.find({
      collection: 'customers',
      where: {
        email: { equals: 'customer@laubevoyage.com' },
      },
      limit: 1,
    })
    customerDoc = existing.docs?.[0]
  }

  if (customerDoc) {
    const customerId = customerDoc.id
    // Check if they have a welcome bonus ledger entry
    const existingLedger = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
        type: { equals: 'welcome_bonus' },
      },
      limit: 1,
    })

    if (existingLedger.totalDocs === 0) {
      console.log(`   🎁 Seeding welcome bonus points ledger entry for Customer #${customerId}...`)
      await payload.create({
        collection: 'point-ledger',
        data: {
          user: customerId,
          ledgerVersion: 1,
          referenceType: 'system_welcome',
          referenceId: String(customerId),
          type: 'welcome_bonus',
          amount: 100,
          balance: 100,
          reason: 'Welcome bonus for registering email account',
          metadata: {
            programId: 'LAUBE_LOYALTY',
            programCode: 'LAUBE_LOYALTY',
            programVersion: 1,
          },
        },
      })
      console.log(`   ✅ Welcome bonus ledger entry created successfully.`)
    }
  }
}
