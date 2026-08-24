import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function forensicInspection() {
  console.log('=====================================================')
  console.log('🔍 FORENSIC DATABASE INSPECTION: TRIP COMPLETION TRACE')
  console.log('=====================================================')

  const payload = await getPayload({ config: configPromise })

  // 1. Inspect Bookings #996 and #997 directly
  console.log('\n--- [1] DIRECT INSPECTION: BOOKINGS #996 & #997 ---')
  for (const id of [996, 997]) {
    try {
      const doc = await payload.findByID({
        collection: 'bookings',
        id,
        depth: 1,
      })
      if (!doc) {
        console.log(`Booking #${id}: NOT FOUND`)
        continue
      }
      console.log(`\nBooking #${id} (${doc.bookingNumber || 'No Booking Number'}):`)
      console.log(`  - Status:                ${doc.status}`)
      console.log(`  - Start Date:            ${doc.startDate}`)
      console.log(`  - End Date:              ${doc.endDate}`)
      console.log(`  - completionAt (Raw):    ${doc.completionAt || 'NULL / UNDEFINED'}`)
      console.log(`  - destinationTimezone:   ${doc.destinationTimezone || 'NULL / UNDEFINED'}`)
      console.log(`  - Created At:            ${doc.createdAt}`)
      console.log(`  - Updated At:            ${doc.updatedAt}`)
      
      const exp = typeof doc.experience === 'object' && doc.experience ? doc.experience : null
      if (exp) {
        console.log(`  - Experience ID:         ${(exp as any).id}`)
        console.log(`  - Experience Title:      ${(exp as any).title}`)
        console.log(`  - Experience Type:       ${(exp as any).type}`)
        console.log(`  - Package Mode:          ${(exp as any).packageMode || 'N/A'}`)
        console.log(`  - Duration (Days):       ${(exp as any).durationDays || 'N/A'}`)
        console.log(`  - Duration (Minutes):    ${(exp as any).durationMinutes || (exp as any).duration_duration_minutes || 'N/A'}`)
      } else {
        console.log(`  - Experience (Raw ID):   ${doc.experience}`)
      }

      const slot = typeof doc.departureSlot === 'object' && doc.departureSlot ? doc.departureSlot : null
      if (slot) {
        console.log(`  - Departure Slot ID:     ${(slot as any).id}`)
        console.log(`  - Slot Date:             ${(slot as any).date}`)
        console.log(`  - Slot StartTime:        ${(slot as any).startTime}`)
        console.log(`  - Slot Status:           ${(slot as any).status}`)
      } else {
        console.log(`  - Departure Slot:        ${doc.departureSlot || 'None (Slot-less)'}`)
      }
    } catch (err: unknown) {
      console.log(`Booking #${id}: Error fetching - ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 2. Query Recent Confirmed Bookings
  console.log('\n--- [2] RECENT CONFIRMED BOOKINGS (Last 5) ---')
  const confirmedRes = await payload.find({
    collection: 'bookings',
    where: {
      status: { equals: 'confirmed' },
    },
    sort: '-createdAt',
    limit: 5,
  })
  console.log(`Total confirmed bookings in DB: ${confirmedRes.totalDocs}`)
  for (const doc of confirmedRes.docs) {
    console.log(`- Booking #${doc.id} (${doc.bookingNumber}): startDate=${doc.startDate}, endDate=${doc.endDate}, completionAt=${doc.completionAt || 'NULL'}, timezone=${doc.destinationTimezone || 'NULL'}`)
  }

  // 3. Test exact MaintenanceRepository query for expired confirmed bookings
  console.log('\n--- [3] EXACT MAINTENANCE QUERY: findConfirmedExpiredBookings ---')
  const nowIso = new Date().toISOString()
  console.log(`Current UTC Instant (nowIso): ${nowIso}`)
  
  const eligibleRes = await payload.find({
    collection: 'bookings',
    where: {
      status: { equals: 'confirmed' },
      completionAt: { less_than_equal: nowIso },
    },
    limit: 20,
  })
  console.log(`Eligible bookings returned by query (completionAt <= now): ${eligibleRes.totalDocs}`)
  for (const doc of eligibleRes.docs) {
    console.log(`  -> Match: Booking #${doc.id} (${doc.bookingNumber}), completionAt=${doc.completionAt}`)
  }

  // Check bookings where status is confirmed but completionAt is null
  const nullCompletionRes = await payload.find({
    collection: 'bookings',
    where: {
      status: { equals: 'confirmed' },
      completionAt: { exists: false },
    },
    limit: 10,
  })
  console.log(`Confirmed bookings where completionAt is NULL or missing: ${nullCompletionRes.totalDocs}`)
  for (const doc of nullCompletionRes.docs) {
    console.log(`  -> NULL completionAt: Booking #${doc.id} (${doc.bookingNumber})`)
  }

  // 4. Inspect Maintenance Logs for complete_finished_bookings
  console.log('\n--- [4] MAINTENANCE LOGS (complete_finished_bookings) ---')
  const logs = await payload.find({
    collection: 'maintenance-logs',
    where: {
      jobName: { equals: 'complete_finished_bookings' },
    },
    sort: '-executedAt',
    limit: 5,
  })
  console.log(`Total execution logs found: ${logs.totalDocs}`)
  for (const doc of logs.docs) {
    console.log(`- [${doc.executedAt}] Status: ${doc.status} | Items Processed: ${doc.itemsProcessed} | By: ${doc.startedBy} | Duration: ${doc.durationMs}ms | Error: ${doc.errorDetails || 'None'}`)
  }

  // 5. Inspect Maintenance Leases
  console.log('\n--- [5] ACTIVE MAINTENANCE LEASES ---')
  const leases = await payload.find({
    collection: 'maintenance-leases',
    limit: 10,
  })
  console.log(`Total active/stored leases: ${leases.totalDocs}`)
  for (const lease of leases.docs) {
    console.log(`- Job: ${lease.jobName} | Worker: ${lease.workerId} | Created: ${lease.createdAt} | Expires: ${lease.leaseExpiresAt}`)
  }

  console.log('\n=====================================================')
  console.log('✅ FORENSIC INSPECTION COMPLETED')
  console.log('=====================================================')
  process.exit(0)
}

forensicInspection().catch(err => {
  console.error('Fatal error during inspection:', err)
  process.exit(1)
})
