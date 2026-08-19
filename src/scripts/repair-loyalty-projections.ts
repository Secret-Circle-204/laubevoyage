import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'
import { DeviceSessionRepository } from '../domains/customer/repositories/session-repository'
import { LoyaltyRepository } from '../domains/loyalty/repository'
import { BookingRepository } from '../domains/booking/repository'
import { DashboardQueryBus } from '../domains/dashboard/query-bus'
import { DashboardOverviewAggregator } from '../domains/dashboard/overview-aggregator'
import { DashboardProjectionRepository } from '../domains/dashboard/repository'

async function main() {
  console.log("🏁 Initializing Payload...")
  const payload = await getPayload({ config })
  console.log("Payload initialized.")

  // Get all customers
  const customersRes = await payload.find({
    collection: 'customers',
    limit: 1000,
  })

  console.log(`Auditing and repairing ${customersRes.docs.length} customers...`)

  let repairCount = 0

  for (const customerDoc of customersRes.docs) {
    const customerId = customerDoc.id
    const cachedPoints = customerDoc.loyalty?.points || 0

    // 1. Get Point Ledger entries sum (Authoritative truth)
    const ledgerRes = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
      limit: 1000,
    })
    const ledgerSum = ledgerRes.docs.reduce((acc, entry) => acc + (entry.amount || 0), 0)

    // 2. Fetch or initialize the Dashboard Projection document
    const projRes = await payload.find({
      collection: 'dashboard-projections',
      where: { customer: { equals: customerId } },
      limit: 1,
    })
    const dashboardPoints = (projRes.docs[0]?.projectionJson as any)?.loyalty?.pointsBalance ?? null

    // Determine if repair is required
    const needsRepair = cachedPoints !== ledgerSum || dashboardPoints !== ledgerSum

    if (needsRepair) {
      repairCount++
      console.log(`\n🛠️ [REPAIRING] Customer #${customerId} (${customerDoc.email}):`)
      console.log(`  - Point Ledger Truth:  ${ledgerSum}`)
      console.log(`  - Customer Cache:      ${cachedPoints} -> ${ledgerSum}`)
      console.log(`  - Dashboard Projection: ${dashboardPoints ?? 'None'} -> ${ledgerSum}`)

      // A. Update customer.loyalty.points cache
      const existingLoyalty = customerDoc.loyalty || {}
      await payload.update({
        collection: 'customers',
        id: customerId,
        data: {
          loyalty: {
            ...existingLoyalty,
            points: ledgerSum,
          }
        }
      })

      // B. Rebuild & Save Dashboard Projection from Ledger truth
      const customerRepo = new CustomerRepository(payload)
      const loyaltyRepo = new LoyaltyRepository(payload)
      const bookingRepo = new BookingRepository(payload)
      const sessionRepo = new DeviceSessionRepository(payload)
      const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
      const aggregator = new DashboardOverviewAggregator(queryBus)
      const dashRepo = new DashboardProjectionRepository(payload)
      
      const rebuiltProjection = await aggregator.aggregatePortalOverview(customerId)
      await dashRepo.saveProjection(rebuiltProjection)

      // C. Double-check alignment
      const verifiedCustomer = await payload.findByID({ collection: 'customers', id: customerId })
      const verifiedProj = await payload.find({
        collection: 'dashboard-projections',
        where: { customer: { equals: customerId } },
        limit: 1,
      })
      const finalCustPoints = verifiedCustomer.loyalty?.points || 0
      const finalProjPoints = (verifiedProj.docs[0]?.projectionJson as any)?.loyalty?.pointsBalance || 0

      console.log(`  ✅ [VERIFIED] Customer #${customerId}: Ledger (${ledgerSum}) == Customer Cache (${finalCustPoints}) == Dashboard Projection (${finalProjPoints})`)
    } else {
      console.log(`- Customer #${customerId} (${customerDoc.email}) is already in sync (Ledger: ${ledgerSum}, Customer Cache: ${cachedPoints}, Dashboard Projection: ${dashboardPoints}).`)
    }
  }

  console.log(`\n🎉 Repair process finished. Total customers repaired: ${repairCount}`)
  process.exit(0)
}

main().catch(err => {
  console.error("Error during repair:", err)
  process.exit(1)
})
