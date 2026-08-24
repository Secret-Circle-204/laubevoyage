import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'

async function run() {
  console.log('====================================================================')
  console.log('BATCH 18: FORENSIC AUDIT & INVENTORY RECONCILIATION ENGINE')
  console.log('====================================================================\n')

  const payload = await getPayload({ config })
  const { experience: experienceService } = await getDomainServices()

  console.log('─── PHASE 1: INITIAL SYSTEM-WIDE READ-ONLY AUDIT ───────────────────')
  const initialAudit = await experienceService.auditAllSlots()

  console.log(`Total Departure Slots Audited: ${initialAudit.totalSlotsAudited}`)
  console.log(`Slots With Integrity Drift:   ${initialAudit.slotsWithDrift}`)
  console.log(`Slots Passing All Invariants:  ${initialAudit.slotsPassingAllInvariants}\n`)

  for (const report of initialAudit.reports) {
    if (!report.level1InvariantPassed || !report.level2SourceConsistent) {
      console.log(`⚠️  DRIFT DETECTED on Slot #${report.slotId} (${report.departureId}):`)
      console.log(`   - Stored:    Total = ${report.capacityTotal} | Reserved = ${report.storedReserved} | Sold = ${report.storedSold} | Available = ${report.storedAvailable}`)
      console.log(`   - Expected:  Total = ${report.capacityTotal} | Reserved = ${report.expectedReserved} | Sold = ${report.expectedSold} | Available = ${report.expectedAvailable}`)
      console.log(`   - Drift:     Sold Drift = ${report.driftSold > 0 ? `+${report.driftSold}` : report.driftSold} | Reserved Drift = ${report.driftReserved > 0 ? `+${report.driftReserved}` : report.driftReserved}`)
      console.log(`   - Contributing Confirmed Bookings (${report.contributingBookings.length}):`, report.contributingBookings.map((b) => `#${b.bookingNumber} (${b.seats} seats)`).join(', '))
      console.log(`   - Active Holds (${report.activeHolds.length}):`, report.activeHolds.map((h) => `${h.holdId} (${h.seats} seats)`).join(', '))
      console.log('')
    }
  }

  console.log('─── PHASE 2: TRANSACTIONAL SELF-HEALING RECONCILIATION ─────────────')
  const reconciliation = await experienceService.reconcileAllSlots()

  console.log(`Slots Reconciled & Healed: ${reconciliation.slotsReconciled}`)
  console.log(`Slots Already Clean:       ${reconciliation.slotsAlreadyClean}\n`)

  for (const res of reconciliation.results) {
    if (res.reconciled) {
      console.log(`✓ Reconciled Slot #${res.slotId} (${res.departureId}):`)
      console.log(`   - Sold:     ${res.auditBefore.storedSold} ➔ ${res.auditAfter.storedSold}`)
      console.log(`   - Reserved: ${res.auditBefore.storedReserved} ➔ ${res.auditAfter.storedReserved}`)
      console.log(`   - Avail:    ${res.auditBefore.storedAvailable} ➔ ${res.auditAfter.storedAvailable}`)
      console.log(`   - Version:  v${res.previousVersion} ➔ v${res.nextVersion}`)
    }
  }

  console.log('\n─── PHASE 3: POST-RECONCILIATION VERIFICATION AUDIT ────────────────')
  const finalAudit = await experienceService.auditAllSlots()

  console.log(`Total Departure Slots Audited: ${finalAudit.totalSlotsAudited}`)
  console.log(`Slots With Integrity Drift:   ${finalAudit.slotsWithDrift}`)
  console.log(`Slots Passing All Invariants:  ${finalAudit.slotsPassingAllInvariants}\n`)

  if (finalAudit.slotsWithDrift > 0) {
    console.error('❌ FATAL: Drifts persist after reconciliation!')
    process.exit(1)
  }

  console.log('🎉 100% INVENTORY RECONCILIATION & SSOT INTEGRITY VERIFIED.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal reconciliation error:', err)
  process.exit(1)
})
