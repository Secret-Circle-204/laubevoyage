import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function testIsolation() {
  console.log('--- 🔬 ISOLATION TEST FOR POINT-LEDGER PAYLOAD.CREATE ---')
  const payload = await getPayload({ config })

  // Find a test customer
  const customerRes = await payload.find({
    collection: 'customers',
    limit: 1,
  })

  if (customerRes.docs.length === 0) {
    console.error('❌ No customers found in database for isolation test.')
    process.exit(1)
  }
  const customerId = customerRes.docs[0].id
  console.log(`✅ Using Customer ID #${customerId} for isolation test.`)

  // --- EXPERIMENT 1: Isolated payload.create WITHOUT transaction ---
  console.log('\n🧪 EXPERIMENT 1: Calling payload.create(point-ledger) WITHOUT active transaction...')
  const startTimeExp1 = Date.now()
  try {
    const docExp1 = await payload.create({
      collection: 'point-ledger',
      data: {
        user: customerId,
        type: 'earn',
        amount: 10,
        balance: 10,
        reason: 'Isolation Test Experiment 1',
        ledgerVersion: 1,
        referenceType: 'system_welcome',
        referenceId: `iso_exp1_${Date.now()}`,
      },
      overrideAccess: true,
    })
    console.log(`✅ EXPERIMENT 1 SUCCESS: Created point-ledger document #${docExp1.id} in ${Date.now() - startTimeExp1}ms.`)
  } catch (err: any) {
    console.error(`❌ EXPERIMENT 1 FAILED with error in ${Date.now() - startTimeExp1}ms:`, err.message)
  }

  // --- EXPERIMENT 2: Calling payload.create(point-ledger) INSIDE an uncommitted transaction ---
  console.log('\n🧪 EXPERIMENT 2: Calling payload.create(point-ledger) INSIDE an uncommitted transaction...')
  const transactionID = await payload.db.beginTransaction()
  const req = { transactionID } as any
  const startTimeExp2 = Date.now()
  try {
    console.log(`[Exp 2] Transaction started (${transactionID}). Creating point-ledger doc inside transaction...`)
    const docExp2 = await payload.create({
      collection: 'point-ledger',
      data: {
        user: customerId,
        type: 'earn',
        amount: 10,
        balance: 20,
        reason: 'Isolation Test Experiment 2',
        ledgerVersion: 1,
        referenceType: 'system_welcome',
        referenceId: `iso_exp2_${Date.now()}`,
      },
      overrideAccess: true,
      req,
    })
    console.log(`✅ EXPERIMENT 2 SUCCESS: Created point-ledger document #${docExp2.id} inside transaction in ${Date.now() - startTimeExp2}ms.`)
    await payload.db.commitTransaction(transactionID!)
    console.log(`✅ EXPERIMENT 2 Transaction committed successfully.`)
  } catch (err: any) {
    console.error(`❌ EXPERIMENT 2 FAILED in ${Date.now() - startTimeExp2}ms:`, err.message)
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
  }

  // --- EXPERIMENT 3: Cross-Transaction Lock Interaction ---
  console.log('\n🧪 EXPERIMENT 3: Cross-Transaction Lock interaction (Simulating Booking Flow)...')
  console.log('1. Starting Transaction T3...')
  const tx3 = await payload.db.beginTransaction()
  const req3 = { transactionID: tx3 } as any

  try {
    // Create a fresh booking inside transaction T3
    const draftDoc = await payload.create({
      collection: 'bookings',
      data: {
        user: customerId,
        experience: 2,
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        status: 'pending_payment',
        bookingNumber: `TEST_ISO_${Date.now()}`,
        travelers: [{ firstName: 'Iso', lastName: 'Test', email: 'iso@test.com', phone: '000' }],
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          loyaltyDiscountEGP: 0,
          subtotalEGP: 1000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 1000,
          displayCurrency: 'USD',
          displayAmount: 20,
          exchangeRate: 0.02,
          exchangeRateTimestamp: new Date().toISOString(),
        },
      },
      req: req3,
    })
    console.log(`2. Temporary Booking #${draftDoc.id} created inside Transaction T3 (Uncommitted).`)

    console.log(`3. Now attempting payload.create(point-ledger) referencing Booking #${draftDoc.id} WITHOUT req (outside T3) with 3s timeout...`)

    const createPromise = payload.create({
      collection: 'point-ledger',
      data: {
        user: customerId,
        type: 'earn',
        amount: 50,
        balance: 50,
        reason: 'Experiment 3 Cross Transaction Test',
        booking: draftDoc.id,
        ledgerVersion: 1,
        referenceType: 'booking',
        referenceId: String(draftDoc.id),
      },
      overrideAccess: true,
      // NO req passed here!
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED_3000MS (Database Lock Hang Confirmed!)')), 3000)
    )

    await Promise.race([createPromise, timeoutPromise])
    console.log('✅ EXPERIMENT 3 unexpected success without hang.')
  } catch (err: any) {
    console.error(`🚨 EXPERIMENT 3 RESULT: ${err.message}`)
  } finally {
    console.log('4. Rolling back Transaction T3 to restore database state...')
    if (tx3) await payload.db.rollbackTransaction(tx3)
  }

  console.log('\n--- 🔬 ISOLATION TEST COMPLETE ---')
  process.exit(0)
}

testIsolation().catch((err) => {
  console.error('❌ Fatal error running isolation test:', err)
  process.exit(1)
})
