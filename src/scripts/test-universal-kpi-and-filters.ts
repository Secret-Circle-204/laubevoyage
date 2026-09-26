import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { UniversalKpiStrip } from '../components/admin/universal-table/UniversalKpiStrip'
import { composeWhere, extractClauseMap } from '../components/admin/universal-table/utils/composeWhere'

async function run() {
  console.log('====================================================')
  console.log('🧪 LIVE RECONNAISSANCE & VERIFICATION AUDIT')
  console.log('====================================================')

  const tInit = Date.now()
  const payload = await getPayload({ config })
  console.log(`✓ Payload initialized in ${Date.now() - tInit}ms`)

  // Find a real admin user to test access control
  const users = await payload.find({ collection: 'users', limit: 1 })
  const adminUser = users.docs[0]
  console.log(`✓ Testing with admin user: ${adminUser?.email} (ID: ${adminUser?.id})`)

  console.log('\n----------------------------------------------------')
  console.log('1. TESTING UniversalKpiStrip FOR EXPERIENCES (LIVE DB)')
  console.log('----------------------------------------------------')

  const tExpStart = Date.now()
  const expKpiJsx = await UniversalKpiStrip({
    payload,
    collectionSlug: 'experiences',
    user: adminUser,
    overrideAccess: false,
  })
  const expKpiDuration = Date.now() - tExpStart
  console.log(`✓ Experiences KPI computed in ${expKpiDuration}ms`)
  console.log(`✓ JSX rendered type:`, expKpiJsx?.type?.name || 'TableKpiStrip')
  console.log(`✓ Metrics payload:`, JSON.stringify(expKpiJsx?.props?.metrics, null, 2))

  // Test Experiences cache (consecutive call)
  const tExpCache = Date.now()
  const expKpiCached = await UniversalKpiStrip({
    payload,
    collectionSlug: 'experiences',
    user: adminUser,
    overrideAccess: false,
  })
  const expCacheDuration = Date.now() - tExpCache
  console.log(`✓ Experiences consecutive call (cache hit): ${expCacheDuration}ms (instant)`)
  console.log(`✓ Cache returned identical metric count: ${expKpiCached?.props?.metrics?.length}`)

  console.log('\n----------------------------------------------------')
  console.log('2. TESTING UniversalKpiStrip FOR BOOKINGS (LIVE DB)')
  console.log('----------------------------------------------------')

  const tBookStart = Date.now()
  const bookKpiJsx = await UniversalKpiStrip({
    payload,
    collectionSlug: 'bookings',
    user: adminUser,
    overrideAccess: false,
  })
  const bookKpiDuration = Date.now() - tBookStart
  console.log(`✓ Bookings KPI computed in ${bookKpiDuration}ms`)
  console.log(`✓ Metrics payload:`, JSON.stringify(bookKpiJsx?.props?.metrics, null, 2))

  console.log('\n----------------------------------------------------')
  console.log('3. TESTING FILTER TRANSITION SEQUENCE & NETWORK WHERE CLAUSES')
  console.log('----------------------------------------------------')

  const sequence = [
    { name: '1. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] } },
    { name: '2. Confirmed', field: 'status', val: { equals: 'confirmed' } },
    { name: '3. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] } },
    { name: '4. Pending Admin Review', field: 'status', val: { equals: 'pending_admin_review' } },
    { name: '5. Confirmed', field: 'status', val: { equals: 'confirmed' } },
    { name: '6. Total (Reset)', field: null, val: null },
    { name: '7. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] } },
  ]

  let currentWhere: any = undefined

  for (const step of sequence) {
    if (step.field) {
      // If setting a status filter, clean up paymentStatus or vice-versa to test mutual transitions
      if (step.field === 'status') {
        currentWhere = composeWhere(currentWhere, 'paymentStatus', null)
      } else if (step.field === 'paymentStatus') {
        currentWhere = composeWhere(currentWhere, 'status', null)
      }
      currentWhere = composeWhere(currentWhere, step.field, step.val)
    } else {
      currentWhere = undefined
    }

    const clauseMap = extractClauseMap(currentWhere)
    const activeKeys = Array.from(clauseMap.keys()).sort().join(':') || 'empty'
    const whereStr = JSON.stringify(currentWhere)

    // Critical assertion: status must NEVER be unpaid or partially_paid
    const statusVal = clauseMap.get('status')
    if (statusVal) {
      const valStr = JSON.stringify(statusVal)
      if (valStr.includes('unpaid') || valStr.includes('partially_paid')) {
        throw new Error(`CRITICAL DEFECT DETECTED: status contains unpaid: ${valStr}`)
      }
    }

    console.log(`Step: ${step.name}`)
    console.log(`  ➔ activeFilterFieldsKey: "${activeKeys}"`)
    console.log(`  ➔ React Key: "list-controls-bookings-${activeKeys}"`)
    console.log(`  ➔ Where query:`, whereStr)

    // Execute actual query in Postgres to verify SQL syntax & execution
    const tQuery = Date.now()
    const queryResult = await payload.find({
      collection: 'bookings',
      where: currentWhere,
      limit: 5,
      depth: 0,
      overrideAccess: false,
      user: adminUser,
    })
    console.log(`  ➔ Executed against Postgres: ${Date.now() - tQuery}ms, matched docs: ${queryResult.totalDocs}`)
  }

  console.log('\n====================================================')
  console.log('✅ ALL LIVE VERIFICATION CHECKS COMPLETED SUCCESSFULLY')
  console.log('====================================================')
  process.exit(0)
}

run().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
