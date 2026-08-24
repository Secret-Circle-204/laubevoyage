import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function inspect() {
  console.log("=== STRICT READ-ONLY FORENSIC INSPECTION OF BOOKING #554 ===")
  const payload = await getPayload({ config: configPromise })

  console.log("\n1. BOOKING #554 RECORD:")
  const booking = await payload.findByID({
    collection: 'bookings',
    id: 554,
    depth: 2,
  })
  console.log(JSON.stringify(booking, null, 2))

  console.log("\n2. DEPARTURE SLOT #46 RECORD:")
  const slot = await payload.findByID({
    collection: 'departure-slots',
    id: 46,
    depth: 1,
  })
  console.log(JSON.stringify(slot, null, 2))

  console.log("\n3. POINT LEDGER ENTRIES FOR CUSTOMER #91 & BOOKING #554:")
  const ledger = await payload.find({
    collection: 'point-ledger',
    where: {
      user: { equals: 91 },
    },
    sort: '-createdAt',
    limit: 10,
  })
  console.log(JSON.stringify(ledger.docs, null, 2))

  console.log("\n4. CUSTOMER #91 RECORD:")
  const customer = await payload.findByID({
    collection: 'customers',
    id: 91,
  })
  console.log(`Customer #${customer.id}: email=${customer.email}, loyaltyPoints=${customer.loyalty?.points}, tier=${customer.loyalty?.tier}`)

  console.log("\n5. EXPERIENCE #3 RECORD:")
  const experience = await payload.findByID({
    collection: 'experiences',
    id: 3,
  })
  console.log(`Experience #${experience.id}: title=${experience.title}, type=${experience.type}, packageMode=${experience.packageMode}, durationDays=${experience.duration?.days}, price=${experience.price}`)

  process.exit(0)
}

inspect().catch(err => {
  console.error("Inspection error:", err)
  process.exit(1)
})
