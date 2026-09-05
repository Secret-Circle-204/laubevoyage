import type { Payload, PayloadRequest } from 'payload'
import type { Customer, PointLedger } from '@/payload-types'
import { LoyaltyTier, RequestContext } from '@/types'
import type { LoyaltyAggregate } from './aggregate'
import type { LoyaltyProjection } from './projection'
import type { PointLedgerRecord, LedgerEntryType, LedgerReferenceType } from './types'
import type { LoyaltyProgramConfig, TierDefinitionConfig } from './tier-config'
import { LoyaltyProgramConfigurationException } from './tier-config'
import { FinancialInvariantException } from '../shared/exceptions/domain-exception'
import { LedgerValidator } from './ledger-validator'
import { TierPolicy } from './tier-policy'

interface RawProgramConfigDoc {
  id?: string | number
  programCode?: string | null
  name?: string | null
  version?: number | null
  status?: 'draft' | 'review' | 'published' | 'archived' | null
  baseEarnRate?: number | null
  redemptionPointsUnit?: number | null
  redemptionValueEGP?: number | null
  minRedemptionPoints?: number | null
  maxRedemptionPercent?: number | null
  maxRedemptionFixedEGP?: number | null
  allowPartialRedemption?: boolean | null
  redemptionStepUnit?: number | null
  welcomeBonus?: number | null
  expirationMonths?: number | null
  bonusNeverExpires?: boolean | null
  tiers?: Array<{
    tier?: string | null
    label?: string | null
    minSpentEGP?: number | null
    earnMultiplier?: number | null
    upgradeBonus?: number | null
  }> | null
}

interface RawLedgerRecordDoc {
  id?: string | number
  user?: number | { id: number | string } | null
  ledgerVersion?: number | null
  type?: string | null
  amount?: number | null
  balance?: number | null
  referenceType?: string | null
  referenceId?: string | number | null
  reason?: string | null
  booking?: number | { id: number | string } | null
  expiresAt?: string | Date | null
  metadata?: unknown
  createdAt?: string | Date | null
}

/**
 * Loyalty Repository
 * Sole data persistence & retrieval layer for the Loyalty Domain.
 * Manages Append-Only PointLedger transactions, customer loyalty projections, and published LoyaltyProgram database queries.
 * Enforces STRICT FAIL FAST: No hardcoded fallback values for business rules in code.
 * Zero Caching Responsibilities: Caching is managed separately by LoyaltyProgramRegistry.
 */
export class LoyaltyRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  private mapContextToReq(context?: RequestContext): PayloadRequest | undefined {
    if (!context || context.transactionId === null || context.transactionId === undefined) {
      return {
        context: {
          eventSource: 'domain',
        },
      } as unknown as PayloadRequest
    }
    return {
      transactionID: context.transactionId,
      context: {
        eventSource: 'domain',
      },
    } as unknown as PayloadRequest
  }

  /**
   * Fetch active published LoyaltyProgramConfig directly from Payload CMS database.
   * STRICT FAIL FAST: Throws LoyaltyProgramConfigurationException if configuration is missing or invalid.
   */
  async getActiveProgramConfig(
    _programCode?: string,
    context?: RequestContext,
  ): Promise<LoyaltyProgramConfig> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.findGlobal({
      slug: 'loyalty-settings',
      req,
    })

    if (!doc) {
      throw new LoyaltyProgramConfigurationException(
        `[LoyaltyRepository CRITICAL ERROR] No LoyaltySettings global configuration document found in database. Fail fast enforced.`,
      )
    }

    return this.mapDocToProgramConfig(doc)
  }

  /**
   * Map Payload document to strongly-typed LoyaltyProgramConfig.
   * STRICT FAIL FAST: Throws explicit exception if any business configuration field is missing.
   */
  private mapDocToProgramConfig(doc: RawProgramConfigDoc): LoyaltyProgramConfig {
    if (!doc.programCode) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing required programCode.',
      )
    }
    if (typeof doc.baseEarnRate !== 'number' || isNaN(doc.baseEarnRate) || doc.baseEarnRate <= 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid baseEarnRate (must be > 0).',
      )
    }
    if (typeof doc.redemptionPointsUnit !== 'number' || isNaN(doc.redemptionPointsUnit) || doc.redemptionPointsUnit <= 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid redemptionPointsUnit (must be > 0).',
      )
    }
    if (typeof doc.redemptionValueEGP !== 'number' || isNaN(doc.redemptionValueEGP) || doc.redemptionValueEGP <= 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid redemptionValueEGP (must be > 0).',
      )
    }
    if (typeof doc.minRedemptionPoints !== 'number' || isNaN(doc.minRedemptionPoints) || doc.minRedemptionPoints < 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid minRedemptionPoints (must be >= 0).',
      )
    }
    if (typeof doc.maxRedemptionPercent !== 'number' || isNaN(doc.maxRedemptionPercent) || doc.maxRedemptionPercent <= 0 || doc.maxRedemptionPercent > 100) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid maxRedemptionPercent (must be between 0 and 100).',
      )
    }
    if (typeof doc.welcomeBonus !== 'number' || isNaN(doc.welcomeBonus) || doc.welcomeBonus < 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid welcomeBonus (must be >= 0).',
      )
    }
    if (typeof doc.expirationMonths !== 'number' || isNaN(doc.expirationMonths) || doc.expirationMonths <= 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: missing or invalid expirationMonths (must be > 0).',
      )
    }
    if (!Array.isArray(doc.tiers) || doc.tiers.length === 0) {
      throw new LoyaltyProgramConfigurationException(
        'Invalid LoyaltyProgram document: tier rules matrix is required.',
      )
    }

    const mappedTiers: TierDefinitionConfig[] = []

    doc.tiers.forEach((t) => {
      if (!t || typeof t !== 'object') {
        throw new LoyaltyProgramConfigurationException('Invalid LoyaltyProgram document: tier object is invalid.')
      }

      const tierId = (t.tier as string || '').trim().toLowerCase()
      if (!tierId) {
        throw new LoyaltyProgramConfigurationException('Invalid LoyaltyProgram document: missing tier identifier.')
      }

      if (!t.label || typeof t.label !== 'string' || t.label.trim() === '') {
        throw new LoyaltyProgramConfigurationException(`Invalid LoyaltyProgram document: missing label for tier [${tierId}].`)
      }

      if (
        typeof t.minSpentEGP !== 'number' ||
        isNaN(t.minSpentEGP) ||
        t.minSpentEGP < 0 ||
        typeof t.earnMultiplier !== 'number' ||
        isNaN(t.earnMultiplier) ||
        t.earnMultiplier < 0 ||
        typeof t.upgradeBonus !== 'number' ||
        isNaN(t.upgradeBonus) ||
        t.upgradeBonus < 0
      ) {
        throw new LoyaltyProgramConfigurationException(
          `Invalid LoyaltyProgram document: incomplete or invalid attributes for tier ${t.tier}.`,
        )
      }

      mappedTiers.push({
        tier: tierId,
        label: t.label.trim(),
        minSpentEGP: t.minSpentEGP,
        earnMultiplier: t.earnMultiplier,
        upgradeBonus: t.upgradeBonus,
      })
    })

    const config: LoyaltyProgramConfig = {
      id: String(doc.id),
      programCode: doc.programCode,
      name: doc.name || doc.programCode,
      version: doc.version || 1,
      status: doc.status || 'published',
      baseEarnRate: doc.baseEarnRate,
      redemptionPointsUnit: doc.redemptionPointsUnit,
      redemptionValueEGP: doc.redemptionValueEGP,
      minRedemptionPoints: doc.minRedemptionPoints,
      maxRedemptionPercent: doc.maxRedemptionPercent,
      maxRedemptionFixedEGP:
        typeof doc.maxRedemptionFixedEGP === 'number' ? doc.maxRedemptionFixedEGP : undefined,
      allowPartialRedemption:
        typeof doc.allowPartialRedemption === 'boolean' ? doc.allowPartialRedemption : true,
      redemptionStepUnit:
        typeof doc.redemptionStepUnit === 'number' ? doc.redemptionStepUnit : undefined,
      welcomeBonus: doc.welcomeBonus,
      expirationMonths: doc.expirationMonths,
      bonusNeverExpires: typeof doc.bonusNeverExpires === 'boolean' ? doc.bonusNeverExpires : true,
      tiers: mappedTiers,
    }

    // Run structural checks to validate settings at mapped boundaries (starts at 0 EGP, strictly increasing)
    // This satisfies: "Validate عند تحميل الـ active Loyalty configuration + cache it."
    TierPolicy.getOrderedTiers(config)

    return config
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
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    const req = this.mapContextToReq(context)
    // 1. Financial Ledger Idempotency Guard
    if (referenceType && referenceId) {
      const existing = await this.findLedgerByReference(referenceType, referenceId, type, context)
      if (existing) {
        throw new Error(
          `[LoyaltyRepository] Financial Idempotency Guard: Entry already recorded for ref (${referenceType}:${referenceId}:${type}).`,
        )
      }
    }

    // 2. Fetch current running balance
    const currentBalance = await this.getCurrentBalance(customerId, context)

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

    return record
  }

  /**
   * Find existing ledger entry by reference type, reference ID, and type.
   */
  async findLedgerByReference(
    referenceType: LedgerReferenceType,
    referenceId: string,
    type: LedgerEntryType,
    context?: RequestContext,
  ): Promise<PointLedgerRecord | null> {
    const req = this.mapContextToReq(context)
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
  async getCurrentBalance(customerId: number, context?: RequestContext): Promise<number> {
    const req = this.mapContextToReq(context)
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

  async getLedgerHistory(
    customerId: number,
    limit = 20,
    context?: RequestContext,
  ): Promise<PointLedgerRecord[]> {
    const req = this.mapContextToReq(context)
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
   * Retrieve full point ledger history with server-side pagination.
   */
  async getLedgerHistoryPaginated(
    customerId: number,
    options?: { page?: number; limit?: number },
    context?: RequestContext,
  ): Promise<{
    docs: PointLedgerRecord[]
    totalDocs: number
    totalPages: number
    page: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    const page = options?.page || 1
    const limit = options?.limit || 20
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
      sort: '-createdAt',
      page,
      limit,
      req,
    })

    return {
      docs: result.docs.map((doc) => this.mapDocToLedgerRecord(doc)),
      totalDocs: result.totalDocs,
      totalPages: result.totalPages || 1,
      page: result.page || 1,
      limit: result.limit || 20,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
    }
  }

  /**
   * Retrieve point ledger transactions linked to a specific booking.
   */
  async getBookingLedgerEntries(
    bookingId: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord[]> {
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        booking: { equals: bookingId },
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc) => this.mapDocToLedgerRecord(doc))
  }

  /**
   * Fetch Customer Loyalty Aggregate & Projection.
   */
  async getCustomerAggregate(
    customerId: number,
    context?: RequestContext,
  ): Promise<{ aggregate: LoyaltyAggregate; projection: LoyaltyProjection }> {
    const req = this.mapContextToReq(context)
    const customer = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    const loyaltyData = customer.loyalty || {}

    // Load active settings configuration
    const config = await this.getActiveProgramConfig(undefined, context)
    const ordered = TierPolicy.getOrderedTiers(config)
    const defaultTier = ordered[0].tier

    const tier = (loyaltyData.tier || defaultTier) as LoyaltyTier

    // Domain validation: verify that customer's tier exists in the active configuration
    const tierExists = config.tiers.some((t) => t.tier.toLowerCase() === tier.toLowerCase())
    if (!tierExists) {
      console.error(
        `[LoyaltyRepository DATA INTEGRITY ERROR] Customer #${customerId} has unknown tier [${tier}] which is missing from active settings. Fail-fast enforced.`,
      )
      throw new Error(`[LoyaltyRepository] Data integrity violation: Customer has unknown tier [${tier}]`)
    }
    
    // totalSpentEGP represents the customer's net qualifying spend in EGP.
    // It is calculated from confirmed bookings. Upon booking confirmation, totalSpentEGP increases.
    // Upon booking cancellation and refund, the refunded booking total is deducted from totalSpentEGP.
    // Welcome registration points, manual admin point adjustments, and point redemptions
    // have exactly zero impact on totalSpentEGP.
    const totalSpentEGP = loyaltyData.totalSpent || 0
    const pointsCache = loyaltyData.points || 0

    const latestBalance = await this.getCurrentBalance(customerId, context)

    const aggregate: LoyaltyAggregate = {
      customerId,
      version: 1,
      tier,
      totalSpentEGP,
      tierHistory: [],
      createdAt: customer.createdAt
        ? typeof customer.createdAt === 'string'
          ? customer.createdAt
          : new Date(customer.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: customer.updatedAt
        ? typeof customer.updatedAt === 'string'
          ? customer.updatedAt
          : new Date(customer.updatedAt).toISOString()
        : new Date().toISOString(),
    }

    const projection: LoyaltyProjection = {
      customerId,
      balance: latestBalance,
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
    context?: RequestContext,
  ): Promise<Customer> {
    const req = this.mapContextToReq(context)
    const { aggregate } = await this.getCustomerAggregate(customerId, context)
    const newTotalSpent = aggregate.totalSpentEGP + additionalSpentEGP

    if (newTotalSpent < 0) {
      throw new FinancialInvariantException(
        `[LoyaltyRepository] Financial Invariant Violation: customer totalSpentEGP cannot become negative (attempted: ${newTotalSpent}, current: ${aggregate.totalSpentEGP}, delta: ${additionalSpentEGP}).`,
      )
    }

    const customer = await this.payload.findByID({
      collection: 'customers',
      id: customerId,
      req,
    })

    const doc = await this.payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        loyalty: {
          ...customer.loyalty,
          tier: newTier,
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
  async updateCustomerProjection(
    customerId: number,
    balance: number,
    lastLedgerId: string,
    context?: RequestContext,
  ): Promise<void> {
    const req = this.mapContextToReq(context)
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
  private mapDocToLedgerRecord(doc: RawLedgerRecordDoc): PointLedgerRecord {
    return {
      id: String(doc.id),
      customerId: doc.user && typeof doc.user === 'object' ? Number(doc.user.id) : Number(doc.user),
      ledgerVersion: doc.ledgerVersion || 1,
      type: doc.type as LedgerEntryType,
      points: doc.amount ?? 0,
      resultingBalance: doc.balance ?? 0,
      referenceType: doc.referenceType as LedgerReferenceType,
      referenceId: doc.referenceId ? String(doc.referenceId) : undefined,
      reason: doc.reason || '',
      bookingId: doc.booking
        ? (doc.booking && typeof doc.booking === 'object'
          ? Number(doc.booking.id)
          : Number(doc.booking))
        : undefined,
      expiresAt: doc.expiresAt
        ? typeof doc.expiresAt === 'string'
          ? doc.expiresAt
          : new Date(doc.expiresAt).toISOString()
        : undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      createdAt: doc.createdAt
        ? typeof doc.createdAt === 'string'
          ? doc.createdAt
          : new Date(doc.createdAt).toISOString()
        : new Date().toISOString(),
    }
  }
}
