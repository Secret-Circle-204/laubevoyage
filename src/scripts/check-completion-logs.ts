import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function checkCompletionLogs() {
  const payload = await getPayload({ config: configPromise })

  const logs = await payload.find({
    collection: 'maintenance-logs',
    where: {
      jobName: { equals: 'complete_finished_bookings' },
    },
    sort: '-executedAt',
    limit: 5,
  })

  console.log(`Found ${logs.totalDocs} logs for complete_finished_bookings:`)
  for (const doc of logs.docs) {
    console.log(`- [${doc.executedAt}] Job: ${doc.jobName} | Status: ${doc.status} | Items: ${doc.itemsProcessed} | By: ${doc.startedBy} | Duration: ${doc.durationMs}ms`)
  }

  process.exit(0)
}

checkCompletionLogs().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
