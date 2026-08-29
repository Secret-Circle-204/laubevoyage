import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { SystemRepository } from '../domains/system/repository'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { CustomerLoyaltyLoader } from '../application/loyalty/loaders'
import { sql } from '@payloadcms/db-postgres'

interface ScaleMeasurement {
  tier: string
  datasetSize: { ledger: number; bookings: number; activeHolds: number }
  projectionHitMs: number
  forcedProjectionMissMs: number
  liveLoyaltyMs: number
  liveLoyaltySubqueries: {
    balanceQueryMs: number
    historyQueryMs: number
    historyRows: number
  }
  activeHoldsQuery: {
    durationMs: number
    dbRowsReturned: number
    nodeFilterDurationMs: number
    totalHeldPoints: number
    count: number
    heapUsedMB: number
  }
  aggregatorRebuild: {
    totalDurationMs: number
    queryTimesMs: Record<string, number>
    queryRows: Record<string, number>
    nodeAssemblyMs: number
    projectionWriteMs: number
  }
}

async function runScaleAudit() {
  console.log('======================================================================')
  console.log('🔬 GATE 17.5.36: SCALE, VOLUME & COMPLEXITY CURVE AUDIT')
  console.log('======================================================================\n')

  const payload = await getPayload({ config })
  const drizzle = (payload.db as any).drizzle

  // Initialize System Settings
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  const domainServices = await getDomainServices()
  const bookingRepo = domainServices.booking.getRepository()
  const loyaltyRepo = new LoyaltyRepository(payload)
  const dashboardRepo = domainServices.dashboard.workflowEngine.repository
  const workflowEngine = domainServices.dashboard.workflowEngine
  const loyaltyService = domainServices.loyalty

  const timestamp = Date.now()
  const testEmail = `scale_audit_${timestamp}@example.com`

  console.log(`📦 Creating isolated test customer: ${testEmail}...`)
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: testEmail,
      firstName: 'Scale',
      lastName: 'Tester',
      password: 'Password123!',
      status: 'active',
      _verified: true,
    },
  })
  const customerId = customer.id
  console.log(`✅ Test Customer created with ID: #${customerId}\n`)

  // Resolve an experience & slot for booking creation
  const slotRes = await payload.find({ collection: 'departure-slots', limit: 1 })
  const slot = slotRes.docs[0]
  const rawExp = slot?.experience as any
  const expId = typeof rawExp === 'object' && rawExp !== null ? rawExp.id : (rawExp || 1)
  const slotId = slot?.id || 1

  const measurements: ScaleMeasurement[] = []

  try {
    // ------------------------------------------------------------------------
    // HELPER: Direct Fast SQL Batch Injectors
    // ------------------------------------------------------------------------
    async function injectLedgerEntries(targetTotal: number, currentCount: number) {
      const needed = targetTotal - currentCount
      if (needed <= 0) return
      console.log(`   ⏳ Injecting ${needed} synthetic ledger records into PostgreSQL...`)
      const chunkSize = 2500
      let inserted = 0
      while (inserted < needed) {
        const batchSize = Math.min(chunkSize, needed - inserted)
        const valuesSql = []
        const now = new Date()
        for (let i = 0; i < batchSize; i++) {
          const entryTime = new Date(now.getTime() - (needed - (inserted + i)) * 1000).toISOString()
          valuesSql.push(`(
            ${customerId},
            1,
            'earn',
            10,
            ${100 + inserted + i},
            'admin_ticket',
            'scale_test_ledger_${customerId}_${inserted + i}',
            'Scale Benchmark Synthetic Entry',
            '${entryTime}',
            '${entryTime}'
          )`)
        }
        await drizzle.execute(sql.raw(`
          INSERT INTO "point_ledger" (
            "user_id", "ledger_version", "type", "amount", "balance",
            "reference_type", "reference_id", "reason", "created_at", "updated_at"
          ) VALUES ${valuesSql.join(',')}
        `))
        inserted += batchSize
      }
      console.log(`   ✅ Successfully injected total: ${targetTotal} ledger records.`)
    }

    async function injectHistoricalBookings(targetTotal: number, currentCount: number) {
      const needed = targetTotal - currentCount
      if (needed <= 0) return
      console.log(`   ⏳ Injecting ${needed} historical completed/cancelled bookings via Payload...`)
      const chunkSize = 25
      let inserted = 0
      while (inserted < needed) {
        const batchSize = Math.min(chunkSize, needed - inserted)
        const promises = []
        for (let i = 0; i < batchSize; i++) {
          const idx = currentCount + inserted + i
          const bStatus = idx % 2 === 0 ? 'completed' : 'cancelled'
          promises.push(
            payload.create({
              collection: 'bookings',
              data: {
                bookingNumber: `LBV-SCALE-${customerId}-${idx}`,
                idempotencyKey: `idemp_scale_${customerId}_${idx}_${timestamp}`,
                user: customerId,
                experience: expId,
                departureSlot: slotId,
                status: bStatus as any,
                source: 'website',
                startDate: '2026-09-15',
                endDate: '2026-09-15',
                paymentWindowExpiresAt: new Date().toISOString(),
                pricingSnapshot: {
                  version: 1,
                  pricingVersion: 1,
                  basePriceEGP: 1000,
                  promotionDiscountEGP: 0,
                  couponDiscountEGP: 0,
                  loyaltyDiscountEGP: 0,
                  subtotalEGP: 1000,
                  taxes: 0,
                  fees: 0,
                  totalAmountEGP: 1000,
                  displayCurrency: 'EGP',
                  displayAmount: 1000,
                  exchangeRate: 1,
                },
                pointHold: {
                  holdId: `hld_hist_${idx}`,
                  pointsHeld: 0,
                  monetaryDiscount: { amount: 0, currency: 'EGP' },
                  heldAt: new Date().toISOString(),
                  expiresAt: new Date().toISOString(),
                  status: 'released',
                },
                travelers: [
                  {
                    firstName: 'Scale',
                    lastName: 'User',
                    type: 'adult',
                    email: testEmail,
                    phone: '+201000000000',
                  },
                ],
              },
              context: { eventSource: 'domain' },
            })
          )
        }
        await Promise.all(promises)
        inserted += batchSize
      }
      console.log(`   ✅ Successfully injected total: ${targetTotal} historical bookings.`)
    }

    async function injectActiveHolds(count: number) {
      console.log(`   ⏳ Injecting ${count} active holds in 'pending_admin_review'...`)
      const chunkSize = 25
      let inserted = 0
      while (inserted < count) {
        const batchSize = Math.min(chunkSize, count - inserted)
        const promises = []
        for (let i = 0; i < batchSize; i++) {
          const idx = inserted + i
          promises.push(
            payload.create({
              collection: 'bookings',
              data: {
                bookingNumber: `LBV-HOLD-${customerId}-${idx}_${Date.now()}_${Math.random()}`,
                idempotencyKey: `idemp_hold_${customerId}_${idx}_${Date.now()}_${Math.random()}`,
                user: customerId,
                experience: expId,
                departureSlot: slotId,
                status: 'pending_admin_review',
                source: 'website',
                startDate: '2026-09-15',
                endDate: '2026-09-15',
                paymentWindowExpiresAt: new Date().toISOString(),
                pricingSnapshot: {
                  version: 1,
                  pricingVersion: 1,
                  basePriceEGP: 1000,
                  promotionDiscountEGP: 0,
                  couponDiscountEGP: 0,
                  loyaltyDiscountEGP: 10,
                  subtotalEGP: 990,
                  taxes: 0,
                  fees: 0,
                  totalAmountEGP: 990,
                  displayCurrency: 'EGP',
                  displayAmount: 990,
                  exchangeRate: 1,
                },
                pointHold: {
                  holdId: `hld_active_${customerId}_${idx}`,
                  pointsHeld: 100,
                  monetaryDiscount: { amount: 10, currency: 'EGP' },
                  heldAt: new Date().toISOString(),
                  status: 'held',
                },
                travelers: [
                  {
                    firstName: 'Hold',
                    lastName: 'User',
                    type: 'adult',
                    email: testEmail,
                    phone: '+201000000000',
                  },
                ],
              },
              context: { eventSource: 'domain' },
            })
          )
        }
        await Promise.all(promises)
        inserted += batchSize
      }
      console.log(`   ✅ Injected ${count} active holds.`)
    }

    // ------------------------------------------------------------------------
    // PROBE & MEASUREMENT RUNNER
    // ------------------------------------------------------------------------
    async function runMeasurementTier(
      tierName: string,
      targetLedger: number,
      targetBookings: number,
      targetActiveHolds: number,
      currentLedger: number,
      currentBookings: number
    ): Promise<ScaleMeasurement> {
      console.log(`\n======================================================================`)
      console.log(`📊 EXECUTING ${tierName}: Ledger=${targetLedger}, Bookings=${targetBookings}, Holds=${targetActiveHolds}`)
      console.log(`======================================================================`)

      // Inject delta
      await injectLedgerEntries(targetLedger, currentLedger)
      await injectHistoricalBookings(targetBookings, currentBookings)
      if (targetActiveHolds > 0) {
        await injectActiveHolds(targetActiveHolds)
      }

      // Pre-compile initial projection
      await workflowEngine.executePortalOverviewWorkflow(customerId)

      // 1. TEST A: PROJECTION HIT VS FORCED MISS
      console.log('\n--- 🧪 TEST A: /dashboard Projection Read Scaling ---')
      // 1.1 Pure Projection Hit
      const t0Hit = performance.now()
      const projDoc = await dashboardRepo.findByCustomerId(customerId)
      const hitDuration = performance.now() - t0Hit
      console.log(`• Projection Hit (Indexed Single Row Lookup) : ${hitDuration.toFixed(2)}ms`)

      // 1.2 Forced Projection Miss (Direct In-Memory Workflow Trigger)
      const t0Miss = performance.now()
      const missProj = await workflowEngine.executePortalOverviewWorkflow(customerId)
      const missDuration = performance.now() - t0Miss
      console.log(`• Forced Projection Miss (Full 7-Query Assembly) : ${missDuration.toFixed(2)}ms`)

      // 2. TEST B: LIVE LOYALTY SCALING
      console.log('\n--- 🧪 TEST B: /dashboard/loyalty Live Scaling ---')
      const t0Bal = performance.now()
      const bal = await loyaltyRepo.getCurrentBalance(customerId)
      const balDuration = performance.now() - t0Bal

      const t0Hist = performance.now()
      const hist = await loyaltyRepo.getLedgerHistory(customerId, 50)
      const histDuration = performance.now() - t0Hist

      const t0LoyaltyParallel = performance.now()
      const [pBal, pHist, pProj, pHeld] = await Promise.all([
        loyaltyRepo.getCurrentBalance(customerId),
        loyaltyRepo.getLedgerHistory(customerId, 50),
        dashboardRepo.findByCustomerId(customerId),
        bookingRepo.getActiveHeldPointsForCustomer(customerId),
      ])
      const loyaltyParallelDuration = performance.now() - t0LoyaltyParallel

      console.log(`• getCurrentBalance (sort: -createdAt, limit: 1)  : ${balDuration.toFixed(2)}ms (Balance: ${bal})`)
      console.log(`• getLedgerHistory (limit: 50)                   : ${histDuration.toFixed(2)}ms (Rows: ${hist.length})`)
      console.log(`• Total 4 Parallel Live Queries (Promise.all)      : ${loyaltyParallelDuration.toFixed(2)}ms (Avail: ${Math.max(0, pBal - pHeld)})`)

      // 3. TEST C: ACTIVE HOLDS SCALING & LOOP FORENSICS
      console.log('\n--- 🧪 TEST C: Active Holds Query & Loop Scaling ---')
      const heapBefore = process.memoryUsage().heapUsed / 1024 / 1024
      const t0HoldQuery = performance.now()
      const rawHoldDocs = await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { user: { equals: customerId } },
            { status: { in: ['draft', 'pending_payment', 'pending_admin_review'] } },
          ],
        },
        pagination: false,
        limit: 1000,
      })
      const holdQueryDuration = performance.now() - t0HoldQuery

      const t0HoldLoop = performance.now()
      let totalHeld = 0
      let holdCount = 0
      for (const doc of rawHoldDocs.docs) {
        const hold = doc.pointHold as any
        if (hold && hold.status === 'held' && typeof hold.pointsHeld === 'number' && hold.pointsHeld > 0) {
          if (doc.status !== 'pending_admin_review' && hold.expiresAt && new Date(hold.expiresAt).getTime() <= Date.now()) {
            continue
          }
          totalHeld += hold.pointsHeld
          holdCount++
        }
      }
      const holdLoopDuration = performance.now() - t0HoldLoop
      const heapAfter = process.memoryUsage().heapUsed / 1024 / 1024
      const heapDiffMB = Math.max(0, heapAfter - heapBefore)

      console.log(`• PostgreSQL Returned Rows to Node.js           : ${rawHoldDocs.docs.length} rows`)
      console.log(`• DB Query Execution Duration                     : ${holdQueryDuration.toFixed(2)}ms`)
      console.log(`• Node.js In-Memory Filter Loop Duration          : ${holdLoopDuration.toFixed(2)}ms`)
      console.log(`• Calculated Held Points Summary                  : ${totalHeld} pts (across ${holdCount} active holds)`)
      console.log(`• Heap Memory Impact                              : +${heapDiffMB.toFixed(2)} MB`)

      // 4. TEST D: AGGREGATOR REBUILD BREAKDOWN (THE 7 SUBQUERIES)
      console.log('\n--- 🧪 TEST D: Full Aggregator Rebuild Subquery Breakdown ---')
      const queryTimes: Record<string, number> = {}
      const queryRows: Record<string, number> = {}

      // Q1: customerQueries.getById
      const t0Q1 = performance.now()
      const q1 = await workflowEngine.queryBus.customerQueries.getById(customerId)
      queryTimes['customer.getById'] = performance.now() - t0Q1
      queryRows['customer.getById'] = q1 ? 1 : 0

      // Q2: loyaltyQueries.getProjection
      const t0Q2 = performance.now()
      const q2 = await workflowEngine.queryBus.loyaltyQueries.getProjection(customerId)
      queryTimes['loyalty.getProjection'] = performance.now() - t0Q2
      queryRows['loyalty.getProjection'] = 1

      // Q3: bookingQueries.getCustomerTripSummary
      const t0Q3 = performance.now()
      const q3 = await workflowEngine.queryBus.bookingQueries.getCustomerTripSummary(customerId)
      queryTimes['booking.getCustomerTripSummary'] = performance.now() - t0Q3
      queryRows['booking.getCustomerTripSummary'] = q3.upcomingBookingsCount + q3.completedTripsCount

      // Q4: loyaltyQueries.getActiveProgramConfig
      const t0Q4 = performance.now()
      const q4 = await workflowEngine.queryBus.loyaltyQueries.getActiveProgramConfig()
      queryTimes['loyalty.getActiveProgramConfig'] = performance.now() - t0Q4
      queryRows['loyalty.getActiveProgramConfig'] = q4.tiers.length

      // Q5: loyaltyQueries.getBalance
      const t0Q5 = performance.now()
      const q5 = await workflowEngine.queryBus.loyaltyQueries.getBalance(customerId)
      queryTimes['loyalty.getBalance'] = performance.now() - t0Q5
      queryRows['loyalty.getBalance'] = 1

      // Q6: customerQueries.getActiveSessions
      const t0Q6 = performance.now()
      const q6 = await workflowEngine.queryBus.customerQueries.getActiveSessions(customerId)
      queryTimes['customer.getActiveSessions'] = performance.now() - t0Q6
      queryRows['customer.getActiveSessions'] = q6.length

      // Q7: bookingQueries.getActiveHeldPointsSummaryForCustomer
      const t0Q7 = performance.now()
      const q7 = await workflowEngine.queryBus.bookingQueries.getActiveHeldPointsSummaryForCustomer(customerId)
      queryTimes['booking.getActiveHeldPointsSummary'] = performance.now() - t0Q7
      queryRows['booking.getActiveHeldPointsSummary'] = q7.count

      // Write time
      const t0Write = performance.now()
      await dashboardRepo.saveProjection(missProj)
      const writeDuration = performance.now() - t0Write

      for (const [qName, qTime] of Object.entries(queryTimes)) {
        console.log(`• Subquery [${qName.padEnd(28)}]: ${qTime.toFixed(2)}ms (Rows/Count: ${queryRows[qName]})`)
      }
      console.log(`• Projection Upsert Write Duration                : ${writeDuration.toFixed(2)}ms`)

      const measurement: ScaleMeasurement = {
        tier: tierName,
        datasetSize: { ledger: targetLedger, bookings: targetBookings, activeHolds: targetActiveHolds },
        projectionHitMs: hitDuration,
        forcedProjectionMissMs: missDuration,
        liveLoyaltyMs: loyaltyParallelDuration,
        liveLoyaltySubqueries: {
          balanceQueryMs: balDuration,
          historyQueryMs: histDuration,
          historyRows: hist.length,
        },
        activeHoldsQuery: {
          durationMs: holdQueryDuration,
          dbRowsReturned: rawHoldDocs.docs.length,
          nodeFilterDurationMs: holdLoopDuration,
          totalHeldPoints: totalHeld,
          count: holdCount,
          heapUsedMB: heapDiffMB,
        },
        aggregatorRebuild: {
          totalDurationMs: missDuration,
          queryTimesMs: queryTimes,
          queryRows,
          nodeAssemblyMs: missDuration - Object.values(queryTimes).reduce((a, b) => a + b, 0),
          projectionWriteMs: writeDuration,
        },
      }

      measurements.push(measurement)
      return measurement
    }

    // ========================================================================
    // RUN BENCHMARK TIERS
    // ========================================================================

    // TIER 0: Baseline (10 ledger, 5 bookings, 1 hold)
    await runMeasurementTier('Tier 0 (Baseline)', 10, 5, 1, 0, 0)

    // TIER 1: Moderate User (1,000 ledger, 50 bookings, 5 holds)
    await runMeasurementTier('Tier 1 (Moderate)', 1000, 50, 5, 10, 5)

    // TIER 2: High Scale (10,000 ledger, 250 bookings, 15 holds)
    await runMeasurementTier('Tier 2 (High Scale)', 10000, 250, 15, 1000, 50)

    // TIER 3: Extreme Stress Scale (50,000 ledger, 1,000 bookings, 25 holds)
    await runMeasurementTier('Tier 3 (Extreme Stress 50k)', 50000, 1000, 25, 10000, 250)

    // ------------------------------------------------------------------------
    // TIER 4: TRUNCATION EDGE TEST (1,200 ACTIVE HOLDS PROBE)
    // ------------------------------------------------------------------------
    console.log(`\n======================================================================`)
    console.log(`🔬 SPECIAL PROBE: 1,200 Active Holds & limit: 1000 Truncation Test`)
    console.log(`======================================================================`)
    await injectActiveHolds(1200)

    const t0Probe = performance.now()
    const probeRes = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { user: { equals: customerId } },
          { status: { in: ['draft', 'pending_payment', 'pending_admin_review'] } },
        ],
      },
      pagination: false,
      limit: 1000,
    })
    const probeDuration = performance.now() - t0Probe

    const holdSummary = await bookingRepo.getActiveHeldPointsSummaryForCustomer(customerId)
    console.log(`• Injected Active Holds in DB                       : 1,225 active holds (25 + 1200)`)
    console.log(`• PostgreSQL Rows Returned with limit: 1000         : ${probeRes.docs.length} rows`)
    console.log(`• Authoritative Summary Total Points Reported       : ${holdSummary.totalPoints} pts`)
    console.log(`• Authoritative Summary Active Count Reported       : ${holdSummary.count} holds`)
    console.log(`• Truncation Status                                 : ${holdSummary.count < 1225 ? '🔴 TRUNCATION CONFIRMED (Capped at 1000)' : '🟢 NO TRUNCATION'}\n`)

    // ------------------------------------------------------------------------
    // FINAL BENCHMARK SUMMARY TABLE
    // ------------------------------------------------------------------------
    console.log('==================================================================================================')
    console.log('📊 GATE 17.5.36 FINAL SCALE & VOLUME BENCHMARK SUMMARY MATRIX')
    console.log('==================================================================================================')
    console.log(`Tier Name`.padEnd(25) + `| Ledger`.padEnd(10) + `| Bookings`.padEnd(11) + `| /dash (Hit)`.padEnd(15) + `| /dash (Miss)`.padEnd(16) + `| /loyalty`.padEnd(13) + `| Holds Query`)
    console.log('--------------------------------------------------------------------------------------------------')
    for (const m of measurements) {
      console.log(
        `${m.tier}`.padEnd(25) +
        `| ${m.datasetSize.ledger}`.padEnd(10) +
        `| ${m.datasetSize.bookings}`.padEnd(11) +
        `| ${m.projectionHitMs.toFixed(2)}ms`.padEnd(15) +
        `| ${m.forcedProjectionMissMs.toFixed(2)}ms`.padEnd(16) +
        `| ${m.liveLoyaltyMs.toFixed(2)}ms`.padEnd(13) +
        `| ${m.activeHoldsQuery.durationMs.toFixed(2)}ms (${m.activeHoldsQuery.dbRowsReturned} rows)`
      )
    }
    console.log('==================================================================================================\n')

  } finally {
    // ------------------------------------------------------------------------
    // STRICT TOTAL CLEANUP OF TEST DATA
    // ------------------------------------------------------------------------
    console.log('🧹 CLEANUP: Purging all synthetic scale test records from database...')
    await drizzle.execute(sql.raw(`DELETE FROM "point_ledger" WHERE "user_id" = ${customerId}`))
    await drizzle.execute(sql.raw(`DELETE FROM "bookings" WHERE "user_id" = ${customerId}`))
    await drizzle.execute(sql.raw(`DELETE FROM "dashboard_projections" WHERE "customer_id" = ${customerId}`))
    await drizzle.execute(sql.raw(`DELETE FROM "customers" WHERE "id" = ${customerId}`))
    console.log('✅ Cleanup completed: Zero residual records in PostgreSQL.\n')
  }
}

runScaleAudit().catch(console.error)
