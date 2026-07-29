import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  console.log('🧹 --- START DATABASE CLEANUP ---')

  // 1. Delete all Point Ledger entries
  console.log('Deleting all point ledger entries...')
  const pointsRes = await payload.delete({
    collection: 'point-ledger',
    where: {
      id: { exists: true }
    }
  })
  console.log(`✅ Deleted point ledger entries.`)

  // 2. Delete all Payment Transactions
  console.log('Deleting all payment transactions...')
  await payload.delete({
    collection: 'payment-transactions',
    where: {
      id: { exists: true }
    }
  })
  console.log(`✅ Deleted payment transactions.`)

  // 3. Delete all Bookings
  console.log('Deleting all bookings...')
  const bookingsRes = await payload.delete({
    collection: 'bookings',
    where: {
      id: { exists: true }
    }
  })
  console.log(`✅ Deleted bookings.`)

  // 4. Delete Event Inbox & Outbox
  console.log('Deleting event outbox records...')
  await payload.delete({
    collection: 'event-outbox',
    where: {
      id: { exists: true }
    }
  })
  console.log('Deleting event inbox records...')
  await payload.delete({
    collection: 'event-inbox',
    where: {
      id: { exists: true }
    }
  })
  console.log(`✅ Deleted event inbox/outbox logs.`)

  // 5. Reset customers loyalty caches/tiers
  console.log('Resetting customers loyalty points and tiers cache...')
  const customers = await payload.find({
    collection: 'customers',
    limit: 0
  })
  for (const doc of customers.docs) {
    await payload.update({
      collection: 'customers',
      id: doc.id,
      data: {
        loyaltyPoints: 0,
        tier: 'explorer',
        activeBookingsCount: 0,
        completedBookingsCount: 0,
        totalBookingsCount: 0,
        totalSpentEGP: 0
      } as any
    })
  }
  console.log(`✅ Reset loyalty data for all customers.`)

  console.log('🧹 --- DATABASE CLEANUP COMPLETED ---')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Fatal error running database cleanup:', err)
  process.exit(1)
})
