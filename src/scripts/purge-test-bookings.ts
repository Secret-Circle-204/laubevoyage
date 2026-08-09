import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const ids = [70, 71, 72, 74, 75, 76, 77, 78, 79, 80, 81, 101, 105, 106, 108, 110, 112, 113]

  console.log(`\n🧹 Purging ${ids.length} test bookings from database...`)

  let deletedCount = 0
  for (const id of ids) {
    try {
      const res = await payload.delete({
        collection: 'bookings',
        id,
      })
      if (res) {
        console.log(`- Purged Booking ID: ${id}`)
        deletedCount++
      }
    } catch (err: any) {
      console.log(`- Skipping Booking ID: ${id} (already deleted or not found)`)
    }
  }

  console.log(`\n✅ Done! Successfully purged ${deletedCount} bookings.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

// npx tsx src/scripts/purge-test-bookings.ts
