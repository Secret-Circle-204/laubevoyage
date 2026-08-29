import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { LoyaltyRepository } from '../domains/loyalty/repository'

async function inspectCustomer622AndTiers() {
  console.log('================================================================================')
  console.log('🔍 READ-ONLY FORENSIC INSPECTION: CUSTOMER #622 & ACTIVE LOYALTY TIERS')
  console.log('================================================================================\n')

  const payload = await getPayload({ config })
  const repository = new LoyaltyRepository(payload)

  // 1. Authoritative Active Loyalty Settings
  console.log('--- 1. ACTIVE LOYALTY SETTINGS CONFIGURATION ---')
  const programConfig = await repository.getActiveProgramConfig()
  console.log(`Program Code: ${programConfig.programCode}, Name: ${programConfig.name}, Version: ${programConfig.version}`)
  console.log('Configured Tiers in Database:')
  for (const t of programConfig.tiers) {
    console.log(`   • Tier: "${t.tier}" | Label: "${t.label}" | Min Spent: ${t.minSpentEGP} EGP | Multiplier: ${t.earnMultiplier}x | Bonus: ${t.upgradeBonus} pts`)
  }

  const validTierIds = new Set(programConfig.tiers.map((t) => t.tier.toLowerCase()))

  // 2. Customer #622 Inspection
  console.log('\n--- 2. CUSTOMER #622 INSPECTION ---')
  const customer622 = await payload.findByID({
    collection: 'customers',
    id: 622,
  }).catch(() => null)

  if (customer622) {
    console.log(`Found Customer #622:`)
    console.log(`   • Email: ${customer622.email}`)
    console.log(`   • Name: ${customer622.firstName} ${customer622.lastName}`)
    console.log(`   • Created At: ${customer622.createdAt}`)
    console.log(`   • Updated At: ${customer622.updatedAt}`)
    console.log(`   • Loyalty State:`, customer622.loyalty)
  } else {
    console.log(`Customer #622 not found (may have been cleaned up or soft-deleted).`)
  }

  // 3. Outbox Events for Customer #622
  console.log('\n--- 3. OUTBOX EVENTS FOR CUSTOMER #622 ---')
  const outboxResult = await payload.find({
    collection: 'event-outbox' as any,
    where: {
      or: [
        { aggregateId: { equals: '622' } },
        { 'payload.customerId': { equals: 622 } },
      ],
    },
    limit: 10,
  }).catch(() => ({ docs: [] }))

  console.log(`Found ${outboxResult.docs.length} outbox events for Customer #622:`)
  for (const evt of outboxResult.docs as any[]) {
    console.log(`   • Event ID: ${evt.eventId} | Type: ${evt.eventType} | Status: ${evt.status} | Created: ${evt.createdAt}`)
    console.log(`     Payload:`, JSON.stringify(evt.payload))
  }

  // 4. Scan ALL customers for invalid/unknown tiers
  console.log('\n--- 4. FULL DATABASE SCAN FOR UNKNOWN TIERS ---')
  const allCustomersResult = await payload.find({
    collection: 'customers',
    limit: 1000,
  })

  const unknownTierCustomers: any[] = []
  for (const cust of allCustomersResult.docs) {
    const custTier = cust.loyalty?.tier
    if (!custTier || !validTierIds.has(custTier.toLowerCase())) {
      unknownTierCustomers.push({
        id: cust.id,
        email: cust.email,
        tier: custTier,
        totalSpent: cust.loyalty?.totalSpent,
        points: cust.loyalty?.points,
        createdAt: cust.createdAt,
      })
    }
  }

  console.log(`Total Customers Scanned: ${allCustomersResult.docs.length}`)
  console.log(`Customers with Unknown / Unconfigured Tiers: ${unknownTierCustomers.length}`)
  if (unknownTierCustomers.length > 0) {
    console.log('Details:', unknownTierCustomers)
  }

  console.log('\n================================================================================')
  console.log('FORENSIC AUDIT COMPLETE')
  console.log('================================================================================')
  process.exit(0)
}

inspectCustomer622AndTiers()
