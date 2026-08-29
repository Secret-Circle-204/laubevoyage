import 'dotenv/config'
import { getDomainServices } from '@/domains/factory'
import { registerPresentationSubscriber } from '@/domains/events/subscribers/presentation-subscriber'

/**
 * Operational Maintenance CLI Runner: Reconcile Dashboard Projections
 *
 * Scans all stored CustomerPortalProjection Read Models using bounded, deterministic pagination (`sort: id`).
 * Holds PostgreSQL transaction-scoped advisory locks for each customer during evaluation.
 * Performs ZERO database writes when projections already match canonical SSOT state.
 * Performs atomic writes and purges Next.js cache tags only when real drift is detected.
 * Records execution telemetry in `maintenance-logs` collection.
 *
 * Usage:
 *   pnpm maintenance:reconcile-dashboard
 */
async function main() {
  console.log('================================================================================')
  console.log('🛠️  OPERATIONAL MAINTENANCE: RECONCILE DASHBOARD PROJECTIONS')
  console.log('================================================================================\n')

  const startTime = Date.now()
  const workerId = `cli_ops_${Date.now()}`

  try {
    // Bootstrap Next.js cache revalidation subscriber for cache tag purging on drift
    registerPresentationSubscriber()

    console.log(`[ReconcileCLI] Initializing domain services container (Worker ID: ${workerId})...`)
    const { maintenance } = await getDomainServices()

    console.log('[ReconcileCLI] Starting dashboard projection reconciliation workflow...')
    const result = await maintenance.triggerJob(
      'reconcile_dashboard_projections',
      'manual_admin',
      workerId,
    )

    const durationMs = Date.now() - startTime

    console.log('\n================================================================================')
    console.log('📊 RECONCILIATION SUMMARY REPORT')
    console.log('================================================================================')
    console.log(`• Status:            ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    console.log(`• Items Processed:   ${result.itemsProcessed} projection(s) examined`)
    console.log(`• Execution Time:    ${durationMs}ms`)
    console.log('• Maintenance Logs:  Telemetry recorded in "maintenance-logs" collection')
    console.log('================================================================================\n')

    if (result.success) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('\n❌ [ReconcileCLI] Critical failure during reconciliation:', errMsg)
    process.exit(1)
  }
}

main()
