import React from 'react'
import type { Payload } from 'payload'
import { TableKpiStrip } from './TableKpiStrip'
import type { TableMetric, MetricDescriptor } from './types'
import { getPresentationConfig } from './registry'

export interface UniversalKpiStripServerProps {
  payload?: Payload
  user?: any
  collectionConfig?: {
    slug?: string
    [key: string]: any
  }
  collectionSlug?: string
  overrideAccess?: boolean
  [key: string]: any
}

interface CacheEntry {
  metrics: TableMetric[]
  timestamp: number
}

// Bounded in-memory SSR cache: 30 seconds TTL per collection + user context
// Prevents Postgres COUNT stampedes during rapid navigation, search, or SSR renders
const kpiCache = new Map<string, CacheEntry>()
const KPI_CACHE_TTL_MS = 30_000

/**
 * Authoritative SQL count aggregation helper with bounded memory cache.
 * Executes bounded SQL counts directly via Payload Local API without retrieving full documents.
 * Extracted outside component render body to satisfy React pure render rules (Date.now outside render).
 */
async function getCachedAuthoritativeMetrics(
  payload: Payload,
  collectionSlug: string,
  metricDescriptors: MetricDescriptor[],
  user: any,
  overrideAccess: boolean,
): Promise<TableMetric[] | null> {
  const userId = user?.id ? String(user.id) : 'unauthenticated'
  const cacheKey = `${collectionSlug}:${userId}`
  const now = Date.now()
  const cached = kpiCache.get(cacheKey)

  if (cached && now - cached.timestamp < KPI_CACHE_TTL_MS) {
    return cached.metrics
  }

  try {
    const countResults = await Promise.all(
      metricDescriptors.map((desc) =>
        payload.count({
          collection: collectionSlug as any,
          where: desc.where,
          user,
          overrideAccess,
        }),
      ),
    )

    const totalCount = countResults[0]?.totalDocs ?? 0

    const metrics = metricDescriptors.map((desc, idx) => {
      const val = countResults[idx]?.totalDocs ?? 0
      let percentage: number | undefined = undefined

      if (desc.calculatePercentageOfTotal) {
        percentage = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0
      }

      return {
        id: desc.id,
        label: desc.label,
        value: val,
        percentage,
        loading: false,
        icon: desc.icon,
        variant: desc.variant,
        whereFilter: desc.where,
      }
    })

    kpiCache.set(cacheKey, {
      metrics,
      timestamp: now,
    })

    return metrics
  } catch (error) {
    console.error(
      `[UniversalKpiStrip] Failed to compute authoritative KPI counts for ${collectionSlug}:`,
      error,
    )
    return null
  }
}

/**
 * Universal Server Component: Authoritative Collection KPI Metrics.
 *
 * Architecture & Governance:
 * 1. Declarative & Generic: Reads metric descriptors from the collection's presentation config.
 * 2. Authoritative Server Aggregation: Executes bounded SQL counts directly via Payload Local API.
 * 3. Zero Document Fetching: Never retrieves full collection documents (scales safely to 100k+ records).
 * 4. Strict Access Control: Enforces authenticated user permissions (overrideAccess: false) by default.
 * 5. Bounded Cache: 30-second in-memory cache isolates collection and user context.
 * 6. Pure Component Render: Component is completely pure and idempotent, delegating to async helper.
 * 7. Interactive Filter Contract: Each metric card exposes its declarative whereFilter for instant AG Grid filtering.
 */
export async function UniversalKpiStrip(props: UniversalKpiStripServerProps) {
  const payload = props.payload
  if (!payload) return null

  const collectionSlug =
    props.collectionConfig?.slug ||
    props.collectionSlug ||
    (props.params?.segments?.[1] as string | undefined)

  if (!collectionSlug) return null

  const presentation = getPresentationConfig(collectionSlug)
  const metricDescriptors: MetricDescriptor[] | undefined = presentation?.metrics

  if (!metricDescriptors || metricDescriptors.length === 0) {
    return null
  }

  const overrideAccess = props.overrideAccess ?? false
  const user = props.user

  const metrics = await getCachedAuthoritativeMetrics(
    payload,
    collectionSlug,
    metricDescriptors,
    user,
    overrideAccess,
  )

  if (!metrics || metrics.length === 0) return null
  return <TableKpiStrip metrics={metrics} />
}
