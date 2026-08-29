// @ts-nocheck
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  console.log('=================================================================')
  console.log('🧹 SURGICAL CLEANUP FOR FAILED TEST RUN: CUSTOMER #572')
  console.log('=================================================================')

  const payload = await getPayload({ config })
  const customerId = 572
  const expectedEmail = 'gate21_test_1787932773286@laubevoyage.com'

  // 1. Verify target customer identity before touching anything
  const customer = await payload.findByID({
    collection: 'customers',
    id: customerId,
  }).catch(() => null)

  if (!customer) {
    console.log(`ℹ️ Customer #${customerId} already absent from database.`)
  } else {
    console.log(`🔍 Found customer #${customer.id} with email: ${customer.email}`)
    if (!customer.email.includes('gate21_test_')) {
      throw new Error(`SAFETY ABORT: Customer #${customerId} email (${customer.email}) does not match expected test pattern!`)
    }

    // 2. Delete bookings
    const deletedBookings = await payload.delete({
      collection: 'bookings',
      where: { user: { equals: customerId } },
    })
    console.log(`🗑️ Deleted ${deletedBookings.docs.length} bookings for Customer #${customerId}.`)

    // 3. Delete point-ledger
    const deletedLedger = await payload.delete({
      collection: 'point-ledger',
      where: { user: { equals: customerId } },
    })
    console.log(`🗑️ Deleted ${deletedLedger.docs.length} point-ledger entries for Customer #${customerId}.`)

    // 4. Delete associated registration event in outbox
    const deletedOutbox = await payload.delete({
      collection: 'event-outbox',
      where: {
        or: [
          { eventId: { equals: 'evt_1787932775460_cljjl' } },
          { correlationId: { equals: `corr_cust_${customerId}` } },
        ],
      },
    })
    console.log(`🗑️ Deleted ${deletedOutbox.docs.length} event-outbox records for Customer #${customerId}.`)

    // 5. Delete customer
    await payload.delete({
      collection: 'customers',
      id: customerId,
    })
    console.log(`🗑️ Deleted Customer #${customerId}.`)
  }

  // 6. Final verification of absence
  const verifyCust = await payload.findByID({ collection: 'customers', id: customerId }).catch(() => null)
  const verifyOutbox = await payload.find({ collection: 'event-outbox', where: { eventId: { equals: 'evt_1787932775460_cljjl' } } })
  const verifyLedger = await payload.find({ collection: 'point-ledger', where: { user: { equals: customerId } } })

  console.log('\n--- 📊 FINAL POST-CLEANUP DATABASE PROOF ---')
  console.log(`Customer #${customerId} exists: ${!!verifyCust} (Expected: false)`)
  console.log(`Outbox evt_1787932775460_cljjl exists: ${verifyOutbox.docs.length > 0} (Expected: false)`)
  console.log(`Point Ledger records for #${customerId}: ${verifyLedger.docs.length} (Expected: 0)`)

  if (!verifyCust && verifyOutbox.docs.length === 0 && verifyLedger.docs.length === 0) {
    console.log('✅ ALL TEST #572 ARTIFACTS SUCCESSFULLY & SURGICALLY PURGED.')
  } else {
    throw new Error('Cleanup verification failed: some records still exist.')
  }
}

run().catch((err) => {
  console.error('\n❌ CLEANUP FAILED:', err)
  process.exit(1)
})
