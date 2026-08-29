import type { BookingAggregate } from '@/domains/booking/types'
import type { PointLedgerRecord, PointHoldStatus } from '@/domains/loyalty/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import type {
  BookingLoyaltySummaryDTO,
  BookingRedemptionStatus,
  BookingEarningStatus,
} from '@/application/dashboard/dto'

/**
 * Pure Application Assembler for Booking Loyalty Summary
 * Translates domain financial ledger records and booking aggregate snapshot into an authoritative DTO.
 * Zero Fallbacks / Strict Fail-Fast Validation / SSOT Compliant.
 */
export class BookingLoyaltySummaryAssembler {
  static assemble(
    bookingDoc: BookingAggregate,
    ledgerEntries: PointLedgerRecord[],
    discountPrice?: ConvertedPrice,
  ): BookingLoyaltySummaryDTO {
    // 1. Fail-Fast Integrity Guard on Pricing Snapshot
    if (!bookingDoc.pricingSnapshot) {
      throw new Error(`[BookingLoyaltySummaryAssembler] Missing required pricingSnapshot for Booking #${bookingDoc.id}`)
    }
    const discountFromPointsEGP = bookingDoc.pricingSnapshot.loyaltyDiscountEGP
    if (typeof discountFromPointsEGP !== 'number' || isNaN(discountFromPointsEGP) || discountFromPointsEGP < 0) {
      throw new Error(`[BookingLoyaltySummaryAssembler] Invalid loyaltyDiscountEGP in pricingSnapshot for Booking #${bookingDoc.id}`)
    }

    // 2. Canonical Symmetrical Aggregations from Financial Ledger (SSOT)
    const redeemEntries = ledgerEntries.filter((e) => e.type === 'redeem' || e.type === 'redeemed')
    const refundEntries = ledgerEntries.filter((e) => e.type === 'refund' || e.type === 'refunded')
    const earnEntries = ledgerEntries.filter((e) => e.type === 'earn' || e.type === 'earned')
    const reverseEntries = ledgerEntries.filter((e) => e.type === 'reverse' || e.type === 'reversed')

    const totalRedeemed = redeemEntries.reduce((sum, e) => sum + Math.abs(e.points), 0)
    const totalRefunded = refundEntries.reduce((sum, e) => sum + Math.abs(e.points), 0)
    const totalEarned = earnEntries.reduce((sum, e) => sum + Math.abs(e.points), 0)
    const totalReversed = reverseEntries.reduce((sum, e) => sum + Math.abs(e.points), 0)

    // 3. Point Hold Single Validated Evaluation
    let heldPoints = 0
    let holdStatus: PointHoldStatus | 'none' = 'none'

    if (bookingDoc.pointHold) {
      holdStatus = bookingDoc.pointHold.status
      if (bookingDoc.pointHold.status === 'held') {
        const rawHeld = bookingDoc.pointHold.pointsHeld
        if (typeof rawHeld !== 'number' || isNaN(rawHeld) || rawHeld < 0) {
          throw new Error(`[BookingLoyaltySummaryAssembler] Corrupted pointHold.pointsHeld on booking #${bookingDoc.id}`)
        }
        heldPoints = rawHeld
      }
    }

    // 4. Mathematical Redemption Resolution (Handling Full, Partial, In-flight, and Released)
    let pointsRedeemed: number
    let redemptionStatus: BookingRedemptionStatus

    if (totalRedeemed > 0) {
      pointsRedeemed = totalRedeemed
      if (totalRefunded >= totalRedeemed) {
        redemptionStatus = 'refunded'
      } else if (totalRefunded > 0) {
        redemptionStatus = 'partially_refunded'
      } else {
        redemptionStatus = 'redeemed'
      }
    } else if (holdStatus === 'held') {
      pointsRedeemed = heldPoints
      redemptionStatus = 'held'
    } else if (holdStatus === 'released') {
      pointsRedeemed = 0
      redemptionStatus = 'released'
    } else {
      pointsRedeemed = 0
      redemptionStatus = 'none'
    }

    // 5. Mathematical Earning Resolution (Handling Full, Partial, In-flight, and Pending)
    let pointsEarned: number
    let earningStatus: BookingEarningStatus

    if (totalEarned > 0) {
      pointsEarned = totalEarned
      if (totalReversed >= totalEarned) {
        earningStatus = 'reversed'
      } else if (totalReversed > 0) {
        earningStatus = 'partially_reversed'
      } else {
        earningStatus = 'credited'
      }
    } else if (
      bookingDoc.status === 'pending_admin_review' ||
      bookingDoc.status === 'pending_payment'
    ) {
      pointsEarned = 0
      earningStatus = 'pending'
    } else {
      pointsEarned = 0
      earningStatus = 'none'
    }

    return {
      pointsRedeemed,
      discountPrice,
      discountFromPointsEGP,
      redemptionStatus,
      pointsEarned,
      earningStatus,
      heldPoints,
      holdStatus,
    }
  }
}
