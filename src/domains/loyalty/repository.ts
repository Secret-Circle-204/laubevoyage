import type { Payload, PayloadRequest } from 'payload'
import type { Customer, PointLedger } from '@/payload-types'
import { LoyaltyTier } from '@/types'
import type { LoyaltyAggregate } from './aggregate'
import type { LoyaltyProjection } from './projection'
import type { PointLedgerRecord, LedgerEntryType, LedgerReferenceType } from './types'
import { LedgerValidator } from './ledger-validator'

/**
 * Loyalty Repository
 * Sole data persistence layer for the Loyalty Domain.
 * Manages Append-Only PointLedger transactions and customer loyalty projections.
 */
export class LoyaltyRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Append a new financial ledger entry to PointLedger (100% Append-Only).
   * Rejects duplicate entries with identical (referenceType, referenceId, type).
   */
  async appendLedgerEntry(
    customerId: number,
    type: LedgerEntryType,
    points: number,
    reason: string,
    referenceType?: LedgerReferenceType,
    referenceId?: string,
    bookingId?: number,
    expiresAt?: string,
    metadata?: Record<string, unknown>,
    req?: PayloadRequest,
  ): Promise<PointLedgerRecord> {
    // 1. Financial Ledger Idempotency Guard
    if (referenceType && referenceId) {
      const existing = await this.findLedgerByReference(referenceType, referenceId, type, req)
      if (existing) {
        throw new Error(
          `[LoyaltyRepository] Financial Idempotency Guard: Entry already recorded for ref (${referenceType}:${referenceId}:${type}).`,
        )
      }
    }

    // 2. Fetch current running balance
    const currentBalance = await this.getCurrentBalance(customerId, req)

    // 3. Pre-commit Financial Invariant Validation
    LedgerValidator.validateLedgerEntry(type, points, currentBalance)

    const resultingBalance = currentBalance + points

    // 4. Create immutable point-ledger document
    const doc = await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: customerId,
        type: type as PointLedger['type'],
        amount: points,
        balance: resultingBalance,
        reason,
        booking: bookingId || null,
        expiresAt: expiresAt || null,
        ledgerVersion: 1,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        metadata: metadata || null,
      },
      req,
    })

    const record = this.mapDocToLedgerRecord(doc)

    // 5. Update cached projection on customer document
    await this.updateCustomerProjection(customerId, resultingBalance, String(doc.id), req)

    return record
  }

  /**
   * Find existing ledger entry by reference type, reference ID, and type.
   */
  async findLedgerByReference(
    referenceType: LedgerReferenceType,
    referenceId: string,
    type: LedgerEntryType,
    req?: PayloadRequest,
  ): Promise<PointLedgerRecord | null> {
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        referenceType: { equals: referenceType },
        referenceId: { equals: referenceId },
        type: { equals: type as PointLedger['type'] },
      },
      limit: 1,
      req,
    })

    return result.docs[0] ? this.mapDocToLedgerRecord(result.docs[0]) : null
  }

  /**
   * Get current running balance for customer from latest PointLedger entry.
   */
  async getCurrentBalance(customerId: number, req?: PayloadRequest): Promise<number> {
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
      sort: '-createdAt',
      limit: 1,
      req,
    })

    return result.docs.length > 0 ? result.docs[0].balance : 0
  }

  async getLedgerHistory(customerId: number, limit = 20, req?: PayloadRequest): Promise<PointLedgerRecord[]> {
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
      sort: '-createdAt',
      limit,
      req,
    })

    return result.docs.map((doc) => this.mapDocToLedgerRecord(doc))
  }


  /**
   * Fetch Customer Loyalty Aggregate & Projection.
   */
  async getCustomerAggregate(customerId: number, req?: PayloadRequest): Promise<{ aggregate: LoyaltyAggregate; projection: LoyaltyProjection }> {
    const customer = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    const loyaltyData = customer.loyalty || {}
    const tier = (loyaltyData.tier || LoyaltyTier.EXPLORER) as LoyaltyTier
    const totalSpentEGP = loyaltyData.totalSpent || 0
    const pointsCache = loyaltyData.points || 0

    const latestBalance = await this.getCurrentBalance(customerId, req)

    const aggregate: LoyaltyAggregate = {
      customerId,
      version: 1,
      tier,
      totalSpentEGP,
      tierHistory: [],
      createdAt: customer.createdAt ? (typeof customer.createdAt === 'string' ? customer.createdAt : new Date(customer.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: customer.updatedAt ? (typeof customer.updatedAt === 'string' ? customer.updatedAt : new Date(customer.updatedAt).toISOString()) : new Date().toISOString(),
    }

    const projection: LoyaltyProjection = {
      customerId,
      balance: latestBalance || pointsCache,
      tier,
      totalSpentEGP,
      lastLedgerId: '',
      version: 1,
      updatedAt: new Date().toISOString(),
    }

    return { aggregate, projection }
  }

  /**
   * Update customer tier and total spent EGP.
   */
  async updateCustomerTier(
    customerId: number,
    newTier: LoyaltyTier,
    additionalSpentEGP: number = 0,
    req?: PayloadRequest,
  ): Promise<Customer> {
    const { aggregate } = await this.getCustomerAggregate(customerId, req)
    const newTotalSpent = aggregate.totalSpentEGP + additionalSpentEGP

    const doc = await this.payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        loyalty: {
          tier: newTier as 'explorer' | 'voyager' | 'elite',
          totalSpent: newTotalSpent,
          tierAchievedAt: new Date().toISOString(),
        },
      },
      req,
    })

    return doc as Customer
  }

  /**
   * Update cached balance in customer document projection.
   */
  private async updateCustomerProjection(
    customerId: number,
    balance: number,
    lastLedgerId: string,
    req?: PayloadRequest,
  ): Promise<void> {
    const customer = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    await this.payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        loyalty: {
          ...customer.loyalty,
          points: balance,
        },
      },
      req,
    })
  }

  /**
   * Map Payload document to strongly-typed PointLedgerRecord.
   */
  private mapDocToLedgerRecord(doc: Record<string, any>): PointLedgerRecord {
    return {
      id: String(doc.id),
      customerId: typeof doc.user === 'object' ? Number(doc.user.id) : Number(doc.user),
      ledgerVersion: doc.ledgerVersion || 1,
      type: doc.type as LedgerEntryType,
      points: doc.amount,
      resultingBalance: doc.balance,
      referenceType: doc.referenceType as LedgerReferenceType,
      referenceId: doc.referenceId ? String(doc.referenceId) : undefined,
      reason: doc.reason,
      bookingId: doc.booking ? (typeof doc.booking === 'object' ? Number(doc.booking.id) : Number(doc.booking)) : undefined,
      expiresAt: doc.expiresAt ? (typeof doc.expiresAt === 'string' ? doc.expiresAt : new Date(doc.expiresAt).toISOString()) : undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      createdAt: doc.createdAt ? (typeof doc.createdAt === 'string' ? doc.createdAt : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
    }
  }
}
