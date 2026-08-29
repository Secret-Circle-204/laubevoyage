import type { Payload, PayloadRequest } from 'payload'
import type { CustomerPortalProjection } from './types'
import { sql } from '@payloadcms/db-postgres'

/**
 * Dashboard Projection Repository
 * Data store for pre-compiled CQRS CustomerPortalProjection Read Models.
 * Provides atomic JSONB slice updates, PostgreSQL transaction-scoped advisory locks,
 * and Optimistic Concurrency Control (OCC) guards.
 */
export class DashboardProjectionRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Acquire PostgreSQL transaction-scoped advisory lock for customer projection mutation.
   * Ensures mutual exclusion among concurrent workers for the same customer without row-lock contention.
   */
  async acquireProjectionAdvisoryLock(customerId: number, req?: PayloadRequest): Promise<void> {
    const drizzle = (this.payload.db as any)?.drizzle
    if (drizzle && typeof drizzle.execute === 'function') {
      try {
        await drizzle.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext('dash_proj:' || ${customerId}::text));`
        )
      } catch (err: any) {
        console.warn(`[DashboardProjectionRepository] Advisory lock acquisition skipped:`, err.message)
      }
    }
  }

  async findByCustomerId(customerId: number, req?: PayloadRequest): Promise<CustomerPortalProjection | null> {
    try {
      const res = await this.payload.find({
        collection: 'dashboard-projections',
        where: { customer: { equals: customerId } },
        limit: 1,
        req,
      })

      if (!res.docs.length) return null

      const doc = res.docs[0]
      const projection = doc.projectionJson as unknown as CustomerPortalProjection
      if (projection && typeof doc.version === 'number') {
        projection.version = doc.version
      }

      return projection
    } catch (err: unknown) {
      console.warn(
        `[DashboardProjectionRepository] Projection read failed for customer #${customerId}, falling back to live aggregation:`,
        err instanceof Error ? err.message : String(err),
      )
      return null
    }
  }

  /**
   * Atomically update a single slice (e.g. 'loyalty', 'trips', 'customer', 'security') in PostgreSQL JSONB
   * with Optimistic Concurrency Control (OCC) retry loop and cold-start fallback.
   */
  async updateSlice<K extends keyof CustomerPortalProjection>(
    customerId: number,
    sliceKey: K,
    sliceData: CustomerPortalProjection[K],
    fullFallbackGenerator?: () => Promise<CustomerPortalProjection>,
    req?: PayloadRequest,
    maxRetries = 3,
  ): Promise<CustomerPortalProjection> {
    const drizzle = (this.payload.db as any)?.drizzle
    if (!drizzle || typeof drizzle.execute !== 'function') {
      return this.saveSliceFallback(customerId, { [sliceKey]: sliceData }, fullFallbackGenerator, req)
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const current = await this.findByCustomerId(customerId, req)
      if (!current) {
        if (fullFallbackGenerator) {
          const seeded = await fullFallbackGenerator()
          return this.seedInitialProjection(customerId, seeded, req)
        }
        throw new Error(
          `[DashboardProjectionRepository] Cannot update slice '${String(sliceKey)}': Projection not found for customer #${customerId}`,
        )
      }

      const currentVersion = current.version || 1
      const jsonKeyPath = `{${String(sliceKey)}}`
      const jsonValueStr = JSON.stringify(sliceData)

      try {
        const query = sql`
          UPDATE "dashboard_projections"
          SET "projection_json" = jsonb_set(
                jsonb_set("projection_json", ${sql.raw(`'${jsonKeyPath}'`)}, ${jsonValueStr}::jsonb),
                '{metrics,lastRefreshAt}', to_jsonb(NOW())
              ),
              "version" = "version" + 1,
              "updated_at" = NOW()
          WHERE "customer_id" = ${customerId}
            AND "version" = ${currentVersion}
          RETURNING "version", "projection_json";
        `
        const result = await drizzle.execute(query)
        const row = result?.rows?.[0] || result?.[0]
        if (row) {
          const updatedJson = row.projection_json as CustomerPortalProjection
          updatedJson.version = Number(row.version)
          return updatedJson
        }

        // OCC Conflict: rowCount === 0 -> another worker mutated the projection version!
        console.warn(
          `[DashboardProjectionRepository] OCC version conflict on customer #${customerId} (attempt ${attempt}/${maxRetries}). Retrying slice update...`,
        )
        await new Promise((r) => setTimeout(r, attempt * 20))
      } catch (err: any) {
        console.warn(`[DashboardProjectionRepository] updateSlice SQL attempt ${attempt} error:`, err.message)
        if (attempt === maxRetries) {
          return this.saveSliceFallback(customerId, { [sliceKey]: sliceData }, fullFallbackGenerator, req)
        }
      }
    }

    return this.saveSliceFallback(customerId, { [sliceKey]: sliceData }, fullFallbackGenerator, req)
  }

  /**
   * Atomically update multiple slices (e.g. '{trips}' and '{loyalty}') in a single SQL statement.
   */
  async updateSlices(
    customerId: number,
    slices: Partial<CustomerPortalProjection>,
    fullFallbackGenerator?: () => Promise<CustomerPortalProjection>,
    req?: PayloadRequest,
    maxRetries = 3,
  ): Promise<CustomerPortalProjection> {
    const drizzle = (this.payload.db as any)?.drizzle
    if (!drizzle || typeof drizzle.execute !== 'function') {
      return this.saveSliceFallback(customerId, slices, fullFallbackGenerator, req)
    }

    const sliceKeys = Object.keys(slices) as (keyof CustomerPortalProjection)[]
    if (sliceKeys.length === 0) {
      const current = await this.findByCustomerId(customerId, req)
      if (current) return current
      if (fullFallbackGenerator) return this.saveProjection(await fullFallbackGenerator(), req)
      throw new Error(`[DashboardProjectionRepository] Empty slices passed for customer #${customerId}`)
    }

    if (sliceKeys.length === 1) {
      const key = sliceKeys[0]
      return this.updateSlice(customerId, key, slices[key] as any, fullFallbackGenerator, req, maxRetries)
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const current = await this.findByCustomerId(customerId, req)
      if (!current) {
        if (fullFallbackGenerator) {
          const seeded = await fullFallbackGenerator()
          return this.seedInitialProjection(customerId, seeded, req)
        }
        throw new Error(
          `[DashboardProjectionRepository] Cannot update slices: Projection not found for customer #${customerId}`,
        )
      }

      const currentVersion = current.version || 1

      // Build nested jsonb_set expression safely
      let setExpression = '"projection_json"'
      for (const key of sliceKeys) {
        const valStr = JSON.stringify(slices[key])
        setExpression = `jsonb_set(${setExpression}, '{${String(key)}}', '${valStr.replace(/'/g, "''")}'::jsonb)`
      }
      setExpression = `jsonb_set(${setExpression}, '{metrics,lastRefreshAt}', to_jsonb(NOW()))`

      try {
        const query = sql.raw(`
          UPDATE "dashboard_projections"
          SET "projection_json" = ${setExpression},
              "version" = "version" + 1,
              "updated_at" = NOW()
          WHERE "customer_id" = ${customerId}
            AND "version" = ${currentVersion}
          RETURNING "version", "projection_json";
        `)

        const result = await drizzle.execute(query)
        const row = result?.rows?.[0] || result?.[0]
        if (row) {
          const updatedJson = row.projection_json as CustomerPortalProjection
          updatedJson.version = Number(row.version)
          return updatedJson
        }

        console.warn(
          `[DashboardProjectionRepository] OCC version conflict on customer #${customerId} in updateSlices (attempt ${attempt}/${maxRetries}). Retrying...`,
        )
        await new Promise((r) => setTimeout(r, attempt * 20))
      } catch (err: any) {
        console.warn(`[DashboardProjectionRepository] updateSlices SQL attempt ${attempt} error:`, err.message)
        if (attempt === maxRetries) {
          return this.saveSliceFallback(customerId, slices, fullFallbackGenerator, req)
        }
      }
    }

    return this.saveSliceFallback(customerId, slices, fullFallbackGenerator, req)
  }

  /**
   * Cold-Start Seed: Atomically inserts the initial projection with ON CONFLICT (customer_id) DO NOTHING
   * to guarantee race-free initial creation across multiple workers.
   */
  private async seedInitialProjection(
    customerId: number,
    initialProjection: CustomerPortalProjection,
    req?: PayloadRequest,
  ): Promise<CustomerPortalProjection> {
    const drizzle = (this.payload.db as any)?.drizzle
    if (drizzle && typeof drizzle.execute === 'function') {
      try {
        const projectionId = initialProjection.projectionId || `proj_${customerId}_${Date.now()}`
        const jsonStr = JSON.stringify(initialProjection)
        const query = sql`
          INSERT INTO "dashboard_projections" (
            "projection_id", "customer_id", "projection_json", "version", "created_at", "updated_at"
          ) VALUES (
            ${projectionId}, ${customerId}, ${jsonStr}::jsonb, 1, NOW(), NOW()
          )
          ON CONFLICT ("customer_id") DO NOTHING
          RETURNING "version", "projection_json";
        `
        const result = await drizzle.execute(query)
        const row = result?.rows?.[0] || result?.[0]
        if (row) {
          const seeded = row.projection_json as CustomerPortalProjection
          seeded.version = Number(row.version)
          return seeded
        }
        // Conflict occurred -> Another worker seeded it simultaneously. Re-read and return!
        const existing = await this.findByCustomerId(customerId, req)
        if (existing) return existing
      } catch (seedErr: any) {
        console.warn(`[DashboardProjectionRepository] seedInitialProjection SQL insert skipped:`, seedErr.message)
      }
    }
    return this.saveProjection(initialProjection, req)
  }

  private async saveSliceFallback(
    customerId: number,
    slices: Partial<CustomerPortalProjection>,
    fullFallbackGenerator?: () => Promise<CustomerPortalProjection>,
    req?: PayloadRequest,
  ): Promise<CustomerPortalProjection> {
    const existing = await this.findByCustomerId(customerId, req)
    if (existing) {
      const merged: CustomerPortalProjection = {
        ...existing,
        ...slices,
        metrics: {
          ...existing.metrics,
          lastRefreshAt: new Date().toISOString(),
        },
        version: (existing.version || 1) + 1,
        updatedAt: new Date().toISOString(),
      }
      return this.saveProjection(merged, req)
    }

    if (fullFallbackGenerator) {
      const generated = await fullFallbackGenerator()
      const merged: CustomerPortalProjection = {
        ...generated,
        ...slices,
        metrics: {
          ...generated.metrics,
          lastRefreshAt: new Date().toISOString(),
        },
        version: 1,
        updatedAt: new Date().toISOString(),
      }
      return this.saveProjection(merged, req)
    }

    throw new Error(`[DashboardProjectionRepository] Projection fallback failed for customer #${customerId}`)
  }

  async saveProjection(projection: CustomerPortalProjection, req?: PayloadRequest): Promise<CustomerPortalProjection> {
    try {
      const existing = await this.payload.find({
        collection: 'dashboard-projections',
        where: { customer: { equals: projection.customerId } },
        limit: 1,
        req,
      })

      if (existing.docs.length > 0) {
        await this.payload.update({
          collection: 'dashboard-projections',
          id: existing.docs[0].id,
          data: {
            projectionJson: projection as any,
            version: (existing.docs[0].version || 1) + 1,
          },
          req,
        })
      } else {
        await this.payload.create({
          collection: 'dashboard-projections',
          data: {
            projectionId: projection.projectionId || `proj_${projection.customerId}_${Date.now()}`,
            customer: projection.customerId,
            projectionJson: projection as any,
            version: projection.version || 1,
          },
          req,
        })
      }
    } catch (err: any) {
      console.warn(`[DashboardProjectionRepository] Non-blocking DB save skipped:`, err.message)
    }
    return projection
  }
}
