import type { Payload, PayloadRequest } from 'payload'
import type { CustomerPortalProjection } from './types'

/**
 * Dashboard Projection Repository
 * Data store for pre-compiled CQRS CustomerPortalProjection Read Models.
 */
export class DashboardProjectionRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
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
      
      return projection
    } catch (err: unknown) {
      console.warn(
        `[DashboardProjectionRepository] Projection read failed for customer #${customerId}, falling back to live aggregation:`,
        err instanceof Error ? err.message : String(err),
      )
      return null
    }
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
            version: projection.version || 1,
          },
          req,
        })
      } else {
        await this.payload.create({
          collection: 'dashboard-projections',
          data: {
            projectionId: projection.projectionId,
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
