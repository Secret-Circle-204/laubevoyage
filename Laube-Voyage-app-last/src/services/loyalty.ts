import { BasePayload } from 'payload'
import { User, Booking, LoyaltyPoint } from '../payload-types'
import { getLoyaltyConfig } from './loyaltyConfig'

// Loyalty Constants based on LAUBE-Voyage.md
export const LOYALTY_RULES = {
  EARN_RATE: 0.1, // 1 point per $10 spent
  REDEEM_RATE: 0.1, // 100 points = $10
  TIERS: {
    TRAVELER: {
      name: 'traveler',
      threshold: 0,
      multiplier: 1,
    },
    EXPLORER: {
      name: 'explorer',
      threshold: 5000,
      multiplier: 1.2,
    },
    VOYAGER: {
      name: 'voyager',
      threshold: 15000,
      multiplier: 1.5,
    },
  },
}

/**
 * Calculates points earned based on booking amount and user tier.
 */
export const calculatePoints = (bookingAmount: number, tier: string = 'traveler') => {
  const basePoints = Math.floor(bookingAmount / 10)

  let multiplier = 1
  if (tier === 'explorer') multiplier = LOYALTY_RULES.TIERS.EXPLORER.multiplier
  if (tier === 'voyager') multiplier = LOYALTY_RULES.TIERS.VOYAGER.multiplier

  return Math.floor(basePoints * multiplier)
}

/**
 * Adds points to a user's account and updates their tier if necessary.
 */
export const addPointsToUser = async (
  payload: BasePayload,
  userId: number,
  pointsToAdd: number,
  totalSpendToAdd: number,
  bookingId?: number,
) => {
  const user = (await payload.findByID({
    collection: 'users',
    id: userId,
  })) as User

  if (!user) throw new Error('User not found')

  // Prevent double-counting if highlights are already awarded for this booking
  if (bookingId) {
    const existingEntry = await payload.find({
      collection: 'loyalty-points',
      where: {
        booking: { equals: bookingId },
        type: { equals: 'earned' },
      },
      limit: 1,
    })

    if (existingEntry.totalDocs > 0) {
      console.log(`[Loyalty] Points already rewarded for booking ${bookingId}. Skipping.`)
      return
    }
  }

  const newPoints = (user.loyaltyPoints || 0) + pointsToAdd
  const newTotalSpend = (user.totalSpend || 0) + totalSpendToAdd

  // Tier Jump Logic — uses admin-configured thresholds
  const loyaltyConfig = await getLoyaltyConfig()
  let newTier = user.loyaltyTier || 'traveler'
  if (newTotalSpend >= loyaltyConfig.tiers.voyagerThreshold) {
    newTier = 'voyager'
  } else if (newTotalSpend >= loyaltyConfig.tiers.explorerThreshold) {
    newTier = 'explorer'
  }

  // 1. Update User (Total Spend and Tier only, points are auto-synced)
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      totalSpend: newTotalSpend,
      loyaltyTier: newTier,
    },
  })

  // 2. Create History Entry
  const historyData: Omit<LoyaltyPoint, 'id' | 'createdAt' | 'updatedAt'> = {
    user: userId,
    points: pointsToAdd,
    type: 'earned',
    reason: `Points earned from booking ${bookingId || ''}`,
    booking: bookingId,
  }

  await payload.create({
    collection: 'loyalty-points',
    data: historyData,
  })

  console.log(
    `[Loyalty] Updated user ${userId}: Points=${newPoints}, Spend=${newTotalSpend}, Tier=${newTier}`,
  )
}

/**
 * Removes points from a user's account (e.g. on cancellation/deletion).
 */
export const removePointsFromUser = async (
  payload: BasePayload,
  userId: number,
  bookingId: number,
) => {
  // 1. Find the history entry to know how many points to deduct
  const historyEntries = await payload.find({
    collection: 'loyalty-points',
    where: {
      user: { equals: userId },
      booking: { equals: bookingId },
      type: { equals: 'earned' },
    },
    limit: 1,
  })

  if (historyEntries.totalDocs === 0) {
    console.log(`[Loyalty] No points found to reverse for booking ${bookingId}.`)
    return
  }

  const entry = historyEntries.docs[0] as LoyaltyPoint
  const pointsToDeduct = entry.points

  // 2. Fetch User
  const user = (await payload.findByID({
    collection: 'users',
    id: userId,
  })) as User

  if (!user) {
    console.warn(`[Loyalty] User ${userId} not found during point reversal.`)
    return
  }

  // 3. Calculate spend to deduct (Fetch booking if it still exists)
  let spendToDeduct = 0
  try {
    const booking = (await payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })) as Booking
    spendToDeduct = booking.totalPrice
  } catch (_e) {
    // Fallback: 1 point = $10 spend (base rate)
    spendToDeduct = pointsToDeduct * 10
  }

  // 4. Calculate new values (clamped to 0)
  const newTotalSpend = Math.max(0, (user.totalSpend || 0) - spendToDeduct)

  // 5. Recalculate Tier
  const loyaltyConfig = await getLoyaltyConfig()
  let newTier: 'traveler' | 'explorer' | 'voyager' = 'traveler'
  if (newTotalSpend >= loyaltyConfig.tiers.voyagerThreshold) {
    newTier = 'voyager'
  } else if (newTotalSpend >= loyaltyConfig.tiers.explorerThreshold) {
    newTier = 'explorer'
  }

  // 6. Update User (Tier and Spend only, points are auto-synced on history delete)
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      totalSpend: newTotalSpend,
      loyaltyTier: newTier,
    },
  })

  // 7. Delete History Entry
  await payload.delete({
    collection: 'loyalty-points',
    id: entry.id,
  })

  console.log(
    `[Loyalty Reversal] User ${userId}: Deducted ${pointsToDeduct} pts and ${spendToDeduct} spend. Recalculated Tier: ${newTier}`,
  )
}

/**
 * Refunds spent points if a booking is cancelled.
 */
export async function refundRedeemedPoints(
  payload: BasePayload,
  userId: number,
  bookingId: number,
  pointsRedeemed: number
) {
  try {
    await payload.create({
      collection: 'loyalty-points',
      data: {
        user: userId,
        points: pointsRedeemed,
        type: 'admin',
        reason: `[RESTORED] Refund for cancelled Booking #${bookingId} - ${pointsRedeemed} pts`,
      },
      context: { skipPointsLogging: true },
    })
    console.log(`[Loyalty Refund] Successfully refunded ${pointsRedeemed} points to user ${userId} for Booking ${bookingId}.`)
  } catch (error) {
    console.error(`[Loyalty Refund Error] Failed to refund ${pointsRedeemed} points to user ${userId}:`, error)
  }
}
