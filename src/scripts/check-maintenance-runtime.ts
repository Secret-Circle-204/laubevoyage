import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function checkMaintenanceRuntime() {
  console.log("=== CHECKING MAINTENANCE LOGS IN POSTGRESQL ===")
  const payload = await getPayload({ config: configPromise })

  const logs = await payload.find({
    collection: 'maintenance-logs',
    sort: '-executedAt',
    limit: 10,
  })

  console.log(`Found ${logs.totalDocs} total maintenance logs:`)
  for (const doc of logs.docs) {
    console.log(`- [${doc.executedAt}] Job: ${doc.jobName} | Status: ${doc.status} | Items: ${doc.itemsProcessed} | By: ${doc.startedBy} | Duration: ${doc.durationMs}ms`)
  }

  const leases = await payload.find({
    collection: 'maintenance-leases',
    limit: 10,
  })
  console.log(`\nActive/Stored Maintenance Leases (${leases.totalDocs}):`)
  for (const lease of leases.docs) {
    console.log(`- Job: ${lease.jobName} | Worker: ${lease.workerId} | Acquired: ${lease.createdAt} | Expires: ${lease.leaseExpiresAt}`)
  }

  process.exit(0)
}

checkMaintenanceRuntime().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
