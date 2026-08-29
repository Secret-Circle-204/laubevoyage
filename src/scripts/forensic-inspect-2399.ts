import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  console.log('=================== FORENSIC DB AUDIT: BOOKING #2399 ===================')
  
  // 1. Fetch Booking #2399
  const booking = await payload.findByID({
    collection: 'bookings',
    id: 2399,
  })

  // 2. Fetch Point Ledger entries for Booking #2399
  const ledgerEntries = await payload.find({
    collection: 'point-ledger',
    where: {
      booking: { equals: 2399 },
    },
  })
  console.log('--- POINT LEDGER ENTRIES FOR BOOKING #2399 ---')
  console.log(JSON.stringify(ledgerEntries.docs, null, 2))

  // 3. Fetch Customer record
  const customerId = typeof booking.user === 'object' ? booking.user.id : booking.user
  if (customerId) {
    const customer = await payload.findByID({
      collection: 'customers',
      id: customerId,
    })
    console.log('--- CUSTOMER RECORD ---')
    console.log(JSON.stringify({
      id: customer.id,
      email: customer.email,
      loyaltyPoints: (customer as any).loyaltyPoints,
      loyaltyTier: (customer as any).loyaltyTier,
    }, null, 2))

    const allCustomerLedger = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
    })
    console.log('--- ALL POINT LEDGER ENTRIES FOR CUSTOMER ---')
    console.log(JSON.stringify(allCustomerLedger.docs, null, 2))
  }

  // 4. Fetch Outbox Events for Booking #2399
  const outboxEvents = await (payload as any).find({
    collection: 'outbox',
    where: {
      and: [
        { aggregateType: { equals: 'Booking' } },
        { aggregateId: { equals: '2399' } },
      ],
    },
  })
  console.log('--- OUTBOX EVENTS FOR BOOKING #2399 ---')
  console.log(JSON.stringify(outboxEvents.docs, null, 2))

  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
