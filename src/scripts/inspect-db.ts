import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  console.log('--- START DATABASE INSPECTION ---')

  // 1. Fetch the target booking
  const bookingNumber = 'LBV-260727-39263'
  console.log(`\n1. Fetching Booking with number: ${bookingNumber}`)
  const bookingRes = await payload.find({
    collection: 'bookings',
    where: {
      bookingNumber: { equals: bookingNumber }
    }
  })

  if (bookingRes.docs.length === 0) {
    console.log('❌ Booking not found.')
  } else {
    const booking = bookingRes.docs[0]
    console.log('✅ Booking Found:')
    console.log(`- ID: ${booking.id}`)
    console.log(`- Status: ${booking.status}`)
    console.log(`- Customer ID: ${booking.customerId}`)
    console.log(`- Total Price: ${booking.pricingSnapshot?.totalPriceEGP} EGP`)
    console.log(`- Travelers:`, JSON.stringify(booking.travelers, null, 2))
    console.log(`- Payment Details:`, JSON.stringify(booking.paymentDetails, null, 2))
    
    // 2. Fetch Payment Transactions for this booking
    console.log(`\n2. Fetching Payment Transactions for Booking ID: ${booking.id}`)
    const paymentRes = await payload.find({
      collection: 'payment-transactions',
      where: {
        bookingId: { equals: booking.id }
      }
    })

    if (paymentRes.docs.length === 0) {
      console.log('❌ No payment transaction found for this booking.')
    } else {
      console.log(`✅ Found ${paymentRes.docs.length} payment transactions:`)
      for (const tx of paymentRes.docs) {
        console.log(`- ID: ${tx.id}`)
        console.log(`- Transaction ID: ${tx.transactionId}`)
        console.log(`- Status: ${tx.status}`)
        console.log(`- Provider: ${tx.provider}`)
        console.log(`- Session:`, JSON.stringify(tx.session, null, 2))
        console.log(`- Attempts:`, JSON.stringify(tx.attempts, null, 2))
        console.log(`- Webhook Ledger:`, JSON.stringify(tx.webhookLedger, null, 2))
      }
    }

    // 3. Fetch Event Outbox records
    console.log('\n3. Fetching Event Outbox Records (Recent 10)...')
    const outboxRes = await payload.find({
      collection: 'event-outbox',
      limit: 10,
      sort: '-createdAt'
    })

    if (outboxRes.docs.length === 0) {
      console.log('❌ Event Outbox is empty.')
    } else {
      console.log(`✅ Found ${outboxRes.docs.length} recent events in outbox:`)
      for (const record of outboxRes.docs) {
        console.log(`- Event ID: ${record.eventId}`)
        console.log(`- Event Type: ${record.eventType}`)
        console.log(`- Status: ${record.status}`)
        console.log(`- Retry Count: ${record.retryCount}`)
        console.log(`- Created At: ${record.createdAt}`)
        console.log(`- Error Message: ${record.errorMessage}`)
        console.log(`  Payload details: Booking ID = ${record.payload?.bookingId}, Status = ${record.payload?.status || record.payload?.type}`)
      }
    }

    // 4. Fetch Event Inbox records
    console.log('\n4. Fetching Event Inbox Records...')
    const inboxRes = await payload.find({
      collection: 'event-inbox',
      limit: 10,
      sort: '-createdAt'
    })
    if (inboxRes.docs.length === 0) {
      console.log('❌ Event Inbox is empty.')
    } else {
      console.log(`✅ Found ${inboxRes.docs.length} records in inbox:`)
      for (const record of inboxRes.docs) {
        console.log(`- Event ID: ${record.eventId}`)
        console.log(`- Subscriber: ${record.subscriberName}`)
        console.log(`- Status: ${record.status}`)
        console.log(`- Processed At: ${record.processedAt}`)
      }
    }
  }

  console.log('\n--- END DATABASE INSPECTION ---')
  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal error running inspection:', err)
  process.exit(1)
})
