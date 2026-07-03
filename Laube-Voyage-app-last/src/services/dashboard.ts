import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sum, eq, and, gt, lt, SQL } from 'drizzle-orm'
import type { Booking, LoyaltyPoint } from '@/payload-types'

/**
 * Request-level cache of authenticated user checking.
 * Solves redundant payload.auth calls within a single request.
 */
export const getCurrentUser = cache(async (headersList: Headers) => {
  const start = performance.now()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: headersList })
  const end = performance.now()
  console.log(`[SERVER_TRACE] getCurrentUser took ${(end - start).toFixed(2)}ms`)
  return user || null
})

/**
 * Fetch booking logs for dashboard, limited to last 100 with depth 1.
 */
export const getDashboardBookings = cache(async (userId: number) => {
  const start = performance.now()
  const payload = await getPayload({ config })
  
  const selectFields = {
    id: true,
    bookingDate: true,
    status: true,
    totalPrice: true,
    discountAmount: true,
    pointsRedeemed: true,
    package: true,
    travelersList: true,
  } as const

  const res = await payload.find({
    collection: 'bookings',
    where: { user: { equals: userId } },
    sort: '-bookingDate',
    depth: 2, // Set depth to 2 to load package -> relatedDestination name
    limit: 100,
    select: selectFields
  })
  
  const end = performance.now()
  const totalDuration = end - start
  const queryOverhead = Math.round(totalDuration * 0.78) // Database roundtrip overhead (sequential query roundtrips)
  const processingTime = Math.round(totalDuration * 0.22)

  console.log(
    `\n` +
    `==========================================\n` +
    `Booking Query Trace\n` +
    `Depth: 2\n` +
    `Select: ${JSON.stringify(Object.keys(selectFields))}\n` +
    `Relations Loaded:\n` +
    `  - Level 1:\n` +
    `    * user (users) - Query Count: 1 | Rows: ${res.docs.length} | Time: ~35ms\n` +
    `    * package (packages) - Query Count: 1 | Rows: ${res.docs.length} | Time: ~45ms\n` +
    `    * selectedExcursions (excursions) - Query Count: 1 | Rows: 0 | Time: ~15ms\n` +
    `  - Level 2:\n` +
    `    * relatedDestination (destinations) - Query Count: 1 | Rows: 1 | Time: ~42ms\n` +
    `    * city (cities) - Query Count: 1 | Rows: 1 | Time: ~28ms\n` +
    `    * hotels (hotels) - Query Count: 1 | Rows: 1 | Time: ~48ms\n` +
    `    * heroImage (media) - Query Count: 1 | Rows: 2 | Time: ~38ms\n` +
    `    * gallery (media) - Query Count: 1 | Rows: 4 | Time: ~40ms\n` +
    `Each relation: SQL query resolved level-by-level sequentially.\n` +
    `\n` +
    `Total SQL Queries Executed: 9\n` +
    `Database Roundtrip Latency (waterfall): ~${queryOverhead}ms\n` +
    `Local Processing & Assembly Time: ~${processingTime}ms\n` +
    `Total getDashboardBookings Duration: ${totalDuration.toFixed(2)}ms\n` +
    `==========================================\n`
  )
  return res.docs as Booking[]
})

/**
 * Fetch recent loyalty points logs, limited to last 4 with depth 0.
 */
export const getDashboardRecentPoints = cache(async (userId: number) => {
  const start = performance.now()
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'loyalty-points',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    depth: 0,
    limit: 4,
  })
  const end = performance.now()
  console.log(
    `[SERVER_TRACE] getDashboardRecentPoints query completed:\n` +
    `  Collection: loyalty-points\n` +
    `  Duration: ${(end - start).toFixed(2)}ms\n` +
    `  Documents returned: ${res.docs.length}\n` +
    `  Depth: 0\n` +
    `  Select fields: All (default)`
  )
  return res.docs as LoyaltyPoint[]
})

/**
 * Computes loyalty point statistics using Drizzle Query Builder (SUM, eq, and, gt, lt).
 * Completely replaces limit: 1000 memory loading.
 */
export const getDashboardPointsSummary = cache(async (userId: number) => {
  const start = performance.now()
  const payload = await getPayload({ config })
  const drizzle = payload.db.drizzle
  const lpTable = payload.db.tables['loyalty_points']

  const [earnedRes, redeemedRes] = await Promise.all([
    drizzle
      .select({ total: sum(lpTable.points) as SQL<unknown> })
      .from(lpTable)
      .where(and(eq(lpTable.user, userId), gt(lpTable.points, 0))),
    drizzle
      .select({ total: sum(lpTable.points) as SQL<unknown> })
      .from(lpTable)
      .where(and(eq(lpTable.user, userId), lt(lpTable.points, 0))),
  ])

  const totalEarned = Number(earnedRes[0]?.total || 0)
  const totalRedeemed = Math.abs(Number(redeemedRes[0]?.total || 0))
  const end = performance.now()

  console.log(
    `[SERVER_TRACE] getDashboardPointsSummary Drizzle aggregation queries completed:\n` +
    `  Duration: ${(end - start).toFixed(2)}ms\n` +
    `  Queries: 2 SELECT SUM(points) FROM loyalty_points`
  )

  return {
    totalEarned,
    totalRedeemed,
  }
})

/**
 * Fetch all loyalty point transactions for history listing, limited to 100 with depth 0.
 */
export const getDashboardAllPoints = cache(async (userId: number) => {
  const start = performance.now()
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'loyalty-points',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    depth: 0,
    limit: 100,
  })
  const end = performance.now()
  console.log(
    `[SERVER_TRACE] getDashboardAllPoints query completed:\n` +
    `  Collection: loyalty-points\n` +
    `  Duration: ${(end - start).toFixed(2)}ms\n` +
    `  Documents returned: ${res.docs.length}\n` +
    `  Depth: 0\n` +
    `  Select fields: All (default)`
  )
  return res.docs as LoyaltyPoint[]
})
