import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

async function run() {
  const payload = await getPayload({ config: configPromise })

  console.log('=== CHECKING DEPARTURE SLOTS FOR EXPERIENCES 225 & 231 ===')
  const slots = await payload.find({
    collection: 'departure-slots',
    where: {
      experience: { in: [225, 231] }
    }
  })

  console.log(`Found ${slots.docs.length} departure slots for experiences 225 and 231.`)
  for (const slot of slots.docs) {
    console.log(`Slot ID: ${slot.id}, departureId: ${slot.departureId}, Date: ${slot.date}, capacityReserved: ${slot.capacityReserved}`)
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
