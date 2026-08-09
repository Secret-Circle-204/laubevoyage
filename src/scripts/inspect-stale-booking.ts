import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const ids = [74, 75, 76, 77, 78, 79, 80, 81]

  console.log(`\n🔍 Fetching audit trails for bookings: ${ids.join(', ')}`)
  const res = await payload.find({
    collection: 'bookings',
    where: {
      id: { in: ids }
    },
    limit: 20
  })

  for (const doc of res.docs) {
    console.log(`- Booking: ${doc.bookingNumber} (ID: ${doc.id})`)
    console.log(`  Status: ${doc.status}`)
    console.log(`  capacityHold:`, JSON.stringify(doc.capacityHold, null, 2))
    console.log(`  auditTrail:`, JSON.stringify(doc.auditTrail, null, 2))
    console.log('---')
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
