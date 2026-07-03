import {
  LoyaltyTier,
  PointTransactionType,
  TIER_CONFIG,
  WELCOME_BONUS,
  type PointLedgerEntry,
} from '@/types'
import type { Payload } from 'payload'

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
  async grantWelcomeBonus(userId: string): Promise<number> {
    return this.earn(userId, WELCOME_BONUS, PointTransactionType.WELCOME_BONUS, 'Welcome bonus')
  }

  /**
   * Earn points for a booking
   */
  async earn(
    userId: string,
    amount: number,
    type: PointTransactionType,
    reason: string,
    bookingId?: string,
  ): Promise<number> {
    const currentBalance = await this.getBalance(userId)
    const newBalance = currentBalance + amount

    // Create ledger entry
    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId as any,
        type,
        amount,
        balance: newBalance,
        reason,
        booking: bookingId as any,
        expiresAt:
          type === PointTransactionType.EARNED ? this.calculateExpiry().toISOString() : undefined,
      },
    })

    // Update cached balance
    await this.updateCachedBalance(userId, newBalance)

    return newBalance
  }

  /**
   * Redeem points for booking
   */
  async redeem(userId: string, amount: number, bookingId: string, reason: string): Promise<number> {
    const currentBalance = await this.getBalance(userId)

    if (amount > currentBalance) {
      throw new Error(`Insufficient points. Available: ${currentBalance}, Requested: ${amount}`)
    }

    const newBalance = currentBalance - amount

    // Create ledger entry (negative amount)
    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId as any,
        type: PointTransactionType.REDEEMED,
        amount: -amount,
        balance: newBalance,
        reason,
        booking: bookingId as any,
      },
    })

    // Update cached balance
    await this.updateCachedBalance(userId, newBalance)

    return newBalance
  }

  /**
   * Refund redeemed points when booking is cancelled
   */
  async refund(userId: string, amount: number, bookingId: string): Promise<number> {
    return this.earn(
      userId,
      amount,
      PointTransactionType.REFUNDED,
      `Refund for cancelled booking ${bookingId}`,
      bookingId,
    )
  }

  /**
   * Reverse earned points when booking is cancelled
   */
  async reverse(userId: string, amount: number, bookingId: string): Promise<number> {
    const currentBalance = await this.getBalance(userId)
    const newBalance = currentBalance - amount

    await this.payload.create({
      collection: 'point-ledger',
      data: {
        user: userId as any,
        type: PointTransactionType.REVERSED,
        amount: -amount,
        balance: newBalance,
        reason: `Reversal for cancelled booking ${bookingId}`,
        booking: bookingId as any,
      },
    })

    await this.updateCachedBalance(userId, newBalance)
    return newBalance
  }

  /**
   * Grant tier upgrade bonus
   */
  async grantTierBonus(userId: string, tier: LoyaltyTier): Promise<number> {
    const bonus = TIER_CONFIG[tier].bonus
    if (bonus === 0) return await this.getBalance(userId)

    return this.earn(userId, bonus, PointTransactionType.TIER_UPGRADE, `${tier} tier upgrade bonus`)
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
  async evaluateTier(userId: string): Promise<LoyaltyTier> {
    const user = await this.payload.findByID({
      collection: 'users',
      id: userId,
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
        collection: 'users',
        id: userId,
        data: {
          loyalty: {
            ...user.loyalty,
            tier: newTier,
            tierAchievedAt: new Date().toISOString(),
          },
        } as any,
      })

      // Grant tier bonus
      await this.grantTierBonus(userId, newTier)
    }

    return newTier
  }

  /**
   * Get current points balance from ledger
   */
  async getBalance(userId: string): Promise<number> {
    const latestEntry = await this.payload.find({
      collection: 'point-ledger',
      where: {
        user: {
          equals: userId,
        },
      },
      sort: '-createdAt',
      limit: 1,
    })

    return latestEntry.docs.length > 0 ? latestEntry.docs[0].balance : 0
  }

  /**
   * Get point transaction history
   */
  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
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
    })

    return result.docs.map((doc: any) => ({
      id: doc.id,
      userId: typeof doc.user === 'object' ? doc.user?.id : doc.user,
      type: doc.type as PointTransactionType,
      amount: doc.amount,
      balance: doc.balance,
      reason: doc.reason,
      bookingId: typeof doc.booking === 'object' ? doc.booking?.id : doc.booking,
      createdAt: new Date(doc.createdAt),
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
      metadata: doc.metadata,
    }))
  }

  /**
   * Update cached balance in user record
   */
  private async updateCachedBalance(userId: string, balance: number): Promise<void> {
    const user = await this.payload.findByID({
      collection: 'users',
      id: userId,
    })

    await this.payload.update({
      collection: 'users',
      id: userId,
      data: {
        loyalty: {
          ...user.loyalty,
          points: balance,
        },
      } as any,
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
