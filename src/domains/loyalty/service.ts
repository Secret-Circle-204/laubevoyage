import {
  LoyaltyTier,
  PointTransactionType,
  TIER_CONFIG,
  WELCOME_BONUS,
  type PointLedgerEntry,
} from '@/types'
import type { Payload, PayloadRequest } from 'payload'
import type { PointLedger, Customer } from '@/payload-types'

/**
 * Loyalty Domain Service
 * Single source of truth for all loyalty point operations
 * Points are stored in immutable PointLedger
 * User.loyalty.points is a cached value only
 */
export class LoyaltyService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Grant welcome bonus to new user
   */
  async grantWelcomeBonus(userId: number, req?: PayloadRequest): Promise<number> {
    return this.earn(userId, WELCOME_BONUS, PointTransactionType.WELCOME_BONUS, 'Welcome bonus', undefined, req)
  }

  /**
   * Earn points for a booking
   */
  async earn(
    userId: number,
    amount: number,
    type: PointTransactionType,
    reason: string,
    bookingId?: number,
    req?: PayloadRequest,
  ): Promise<number> {
    const currentBalance = await this.getBalance(userId, req)
    const newBalance = currentBalance + amount

    // Create ledger entry
    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId,
        type: type as PointLedger['type'],
        amount,
        balance: newBalance,
        reason,
        booking: bookingId || null,
        expiresAt:
          type === PointTransactionType.EARNED ? this.calculateExpiry().toISOString() : undefined,
      },
      req,
    })

    // Update cached balance
    await this.updateCachedBalance(userId, newBalance, req)

    return newBalance
  }

  /**
   * Redeem points for booking
   */
  async redeem(userId: number, amount: number, bookingId: number, reason: string, req?: PayloadRequest): Promise<number> {
    const currentBalance = await this.getBalance(userId, req)

    if (amount > currentBalance) {
      throw new Error(`Insufficient points. Available: ${currentBalance}, Requested: ${amount}`)
    }

    const newBalance = currentBalance - amount

    // Create ledger entry (negative amount)
    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId,
        type: 'redeemed',
        amount: -amount,
        balance: newBalance,
        reason,
        booking: bookingId,
      },
      req,
    })

    // Update cached balance
    await this.updateCachedBalance(userId, newBalance, req)

    return newBalance
  }

  /**
   * Refund redeemed points when booking is cancelled
   */
  async refund(userId: number, amount: number, bookingId: number, req?: PayloadRequest): Promise<number> {
    return this.earn(
      userId,
      amount,
      PointTransactionType.REFUNDED,
      `Refund for cancelled booking ${bookingId}`,
      bookingId,
      req,
    )
  }

  /**
   * Reverse earned points when booking is cancelled
   */
  async reverse(userId: number, amount: number, bookingId: number, req?: PayloadRequest): Promise<number> {
    const currentBalance = await this.getBalance(userId, req)
    const newBalance = currentBalance - amount

    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId,
        type: 'reversed',
        amount: -amount,
        balance: newBalance,
        reason: `Reversal for cancelled booking ${bookingId}`,
        booking: bookingId,
      },
      req,
    })

    await this.updateCachedBalance(userId, newBalance, req)
    return newBalance
  }

  /**
   * Grant tier upgrade bonus
   */
  async grantTierBonus(userId: number, tier: LoyaltyTier, req?: PayloadRequest): Promise<number> {
    const bonus = TIER_CONFIG[tier].bonus
    if (bonus === 0) return await this.getBalance(userId, req)

    return this.earn(userId, bonus, PointTransactionType.TIER_UPGRADE, `${tier} tier upgrade bonus`, undefined, req)
  }

  /**
   * Calculate points earned for amount spent
   */
  calculateEarnedPoints(amountSpentEGP: number, tier: LoyaltyTier): number {
    const earnRate = TIER_CONFIG[tier].earnRate
    return Math.floor(amountSpentEGP * earnRate)
  }

  /**
   * Evaluate and upgrade tier if eligible
   */
  async evaluateTier(userId: number, req?: PayloadRequest): Promise<LoyaltyTier> {
    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })

    const totalSpent = user.loyalty?.totalSpent || 0
    const currentTier = (user.loyalty?.tier || LoyaltyTier.EXPLORER) as LoyaltyTier

    let newTier = LoyaltyTier.EXPLORER

    if (totalSpent >= TIER_CONFIG[LoyaltyTier.ELITE].minSpent) {
      newTier = LoyaltyTier.ELITE
    } else if (totalSpent >= TIER_CONFIG[LoyaltyTier.VOYAGER].minSpent) {
      newTier = LoyaltyTier.VOYAGER
    }

    // Only upgrade, never downgrade
    if (this.getTierLevel(newTier) > this.getTierLevel(currentTier)) {
      await this.payload.update({
        collection: 'customers',
        id: userId,
        data: {
          loyalty: {
            ...user.loyalty,
            tier: newTier as 'explorer' | 'voyager' | 'elite',
            tierAchievedAt: new Date().toISOString(),
          },
        },
        req,
      })

      // Grant tier bonus
      await this.grantTierBonus(userId, newTier, req)
    }

    return newTier
  }

  /**
   * Get current points balance from ledger
   */
  async getBalance(userId: number, req?: PayloadRequest): Promise<number> {
    const latestEntry = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: {
          equals: userId,
        },
      },
      sort: '-createdAt',
      limit: 1,
      req,
    })

    return latestEntry.docs.length > 0 ? latestEntry.docs[0].balance : 0
  }

  /**
   * Get point transaction history
   */
  async getHistory(
    userId: number,
    page: number = 1,
    limit: number = 20,
    req?: PayloadRequest,
  ): Promise<PointLedgerEntry[]> {
    const result = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: {
          equals: userId,
        },
      },
      sort: '-createdAt',
      page,
      limit,
      req,
    })

    return result.docs.map((doc: PointLedger) => ({
      id: String(doc.id),
      userId: typeof doc.user === 'object' ? String(doc.user?.id) : String(doc.user),
      type: doc.type as PointTransactionType,
      amount: doc.amount,
      balance: doc.balance,
      reason: doc.reason,
      bookingId: typeof doc.booking === 'object' ? String(doc.booking?.id) : String(doc.booking),
      createdAt: new Date(doc.createdAt),
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    }))
  }

  /**
   * Update cached balance in user record
   */
  private async updateCachedBalance(userId: number, balance: number, req?: PayloadRequest): Promise<void> {
    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })

    await this.payload.update({
      collection: 'customers',
      id: userId,
      data: {
        loyalty: {
          ...user.loyalty,
          points: balance,
        },
      },
      req,
    })
  }

  /**
   * Calculate expiry date for earned points (1 year from now)
   */
  private calculateExpiry(): Date {
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 1)
    return expiry
  }

  /**
   * Get tier level for comparison
   */
  private getTierLevel(tier: LoyaltyTier): number {
    const levels = {
      [LoyaltyTier.EXPLORER]: 1,
      [LoyaltyTier.VOYAGER]: 2,
      [LoyaltyTier.ELITE]: 3,
    }
    return levels[tier]
  }
}
