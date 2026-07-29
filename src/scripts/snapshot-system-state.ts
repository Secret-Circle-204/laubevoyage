import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function snapshotSystemState() {
  console.log('================================================================================')
  console.log('📸 PHASE 0: INITIAL SYSTEM BASELINE SNAPSHOT (Architectural Acceptance Test)')
  console.log('================================================================================\n')

  const payload = await getPayload({ config })

  // 1. Bookings Count
  const bookingsRes = await payload.find({ collection: 'bookings', limit: 1 })
  const totalBookings = bookingsRes.totalDocs

  // 2. Customers Count
  const customersRes = await payload.find({ collection: 'customers', limit: 1 })
  const totalCustomers = customersRes.totalDocs

  // 3. Point Ledger Count
  const pointLedgerRes = await payload.find({ collection: 'point-ledger', limit: 1 })
  const totalPointLedger = pointLedgerRes.totalDocs

  // 4. Event Outbox Metrics
  const outboxTotal = (await payload.find({ collection: 'event-outbox', limit: 1 })).totalDocs
  const outboxPending = (await payload.find({ collection: 'event-outbox', where: { status: { equals: 'pending' } }, limit: 1 })).totalDocs
  const outboxProcessing = (await payload.find({ collection: 'event-outbox', where: { status: { equals: 'processing' } }, limit: 1 })).totalDocs
  const outboxPublished = (await payload.find({ collection: 'event-outbox', where: { status: { equals: 'published' } }, limit: 1 })).totalDocs
  const outboxFailed = (await payload.find({ collection: 'event-outbox', where: { status: { equals: 'failed' } }, limit: 1 })).totalDocs
  const outboxDeadLetter = (await payload.find({ collection: 'event-outbox', where: { status: { equals: 'dead_letter' } }, limit: 1 })).totalDocs

  // 5. Event Inbox Count
  const inboxRes = await payload.find({ collection: 'event-inbox', limit: 1 })
  const totalInbox = inboxRes.totalDocs

  // 6. Admin Audit Logs Count
  const auditLogsRes = await payload.find({ collection: 'admin-audit-logs', limit: 1 })
  const totalAuditLogs = auditLogsRes.totalDocs

  // 7. Get Customer #26 Points Baseline (if exists)
  let customer26Points = 0
  let customer26Tier = 'N/A'
  try {
    const cust26 = await payload.findByID({ collection: 'customers', id: 26 })
    if (cust26 && cust26.loyalty) {
      customer26Points = cust26.loyalty.points || 0
      customer26Tier = cust26.loyalty.tier || 'explorer'
    }
  } catch {
    // Customer #26 might not exist yet
  }

  console.log('📊 SNAPSHOT METRICS BASELINE:')
  console.log(`- Bookings Total:             ${totalBookings}`)
  console.log(`- Customers Total:            ${totalCustomers}`)
  console.log(`- Customer #26 Points:        ${customer26Points} (${customer26Tier.toUpperCase()})`)
  console.log(`- Point Ledger Entries:       ${totalPointLedger}`)
  console.log(`- Event Outbox Total:         ${outboxTotal}`)
  console.log(`  └─ Pending:                ${outboxPending}`)
  console.log(`  └─ Processing:             ${outboxProcessing}`)
  console.log(`  └─ Published:              ${outboxPublished}`)
  console.log(`  └─ Failed:                 ${outboxFailed}`)
  console.log(`  └─ Dead Letter (DLQ):      ${outboxDeadLetter}`)
  console.log(`- Event Inbox Entries:        ${totalInbox}`)
  console.log(`- Admin Audit Logs:           ${totalAuditLogs}`)
  console.log('\n================================================================================\n')

  process.exit(0)
}

snapshotSystemState().catch((err) => {
  console.error('❌ Error capturing system snapshot:', err)
  process.exit(1)
})
