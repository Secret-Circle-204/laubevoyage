import type { ExperienceService } from '@/domains/experience/service'
import type { PricingFacade } from '@/domains/currency/facade'
import type { LocalizationService } from '@/domains/localization/service'
import type { LoyaltyService } from '@/domains/loyalty/service'
import type { BookingService } from '@/domains/booking/service'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { LocaleContext } from '@/types/locale'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import type { PricingSnapshotData } from '@/domains/currency/pipeline'

export interface BookingPricingResult {
  snapshot: PricingSnapshotData
  subtotalPrice: ConvertedPrice
  totalCost: ConvertedPrice
  unitPrice: ConvertedPrice
  departure: BookableDeparture
  originalPrice?: ConvertedPrice
  loyaltyDiscountPrice?: ConvertedPrice
  estimatedEarnPoints?: number
  remainingLoyaltyPoints?: number
}

/**
 * Application Use Case to coordinate dynamic checkout and preview pricing.
 * Ensures the entire price flow sequence (Experience slot resolution -> Pricing math -> Currency conversion & Formatting)
 * exists in exactly one reusable location, preventing duplication across loaders, actions, and API routes.
 */
export class BookingPricingUseCase {
  constructor(
    private readonly experienceService: ExperienceService,
    private readonly pricingFacade: PricingFacade,
    private readonly localizationService: LocalizationService,
    private readonly loyaltyService?: LoyaltyService,
    private readonly bookingService?: BookingService,
  ) {}

  /**
   * Calculate and generate pricing snapshot + formatted prices for a given experience slot and passenger configuration.
   * Encapsulates the entire domain coordination (Experience -> Pricing -> Currency -> Formatting -> Loyalty).
   */
  async calculate({
    experienceId,
    slotId,
    adultsCount,
    childrenCount = 0,
    ctx,
    pointsToRedeem,
    customerId,
  }: {
    experienceId: number
    slotId: number
    adultsCount: number
    childrenCount?: number
    ctx: LocaleContext
    pointsToRedeem?: number
    customerId?: number
  }): Promise<BookingPricingResult> {
    if (!slotId) {
      throw new Error(`[BookingPricingUseCase] slotId is required to calculate checkout pricing.`)
    }

    const departure = await this.experienceService.resolveBookableDepartureBySlot(experienceId, slotId)
    if (!departure) {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} not found for experience #${experienceId}`)
    }
    if (departure.status === 'blacked_out') {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} on ${departure.date} is unavailable due to blackout.`)
    }
    if (departure.status === 'past') {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} on ${departure.date} is in the past and cannot be booked.`)
    }

    const effectiveAdults = Math.max(1, adultsCount)
    const effectiveChildren = Math.max(0, childrenCount)
    const totalBasePriceEGP = departure.effectiveBasePrice * (effectiveAdults + effectiveChildren)

    // 1. Process Loyalty Points Intent via Domain Validation & Valuation (Fail-Fast)
    let pointsValueEGP = 0
    let remainingLoyaltyPoints: number | undefined = undefined

    if (this.loyaltyService && pointsToRedeem && pointsToRedeem > 0) {
      const activeConfig = await this.loyaltyService.getActiveConfig()

      if (customerId) {
        const settledBalance = await this.loyaltyService.getCustomerBalance(customerId)
        const activeHeldPoints = this.bookingService
          ? await this.bookingService.getActiveHeldPointsForCustomer(customerId)
          : 0
        const availableToRedeem = Math.max(0, settledBalance - activeHeldPoints)

        const validation = PointsCalculator.validateRedemptionAmount(
          pointsToRedeem,
          availableToRedeem,
          totalBasePriceEGP,
          activeConfig,
        )
        if (!validation.allowed) {
          throw new Error(`[PointsCalculator] ${validation.reason}`)
        }
        remainingLoyaltyPoints = Math.max(0, availableToRedeem - pointsToRedeem)
      }

      pointsValueEGP = await this.loyaltyService.calculatePointValueInEGP(pointsToRedeem, activeConfig)
    }

    // 2. Delegate Checkout pricing snapshot calculation to pricingFacade (Pricing Domain)
    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.effectiveBasePrice,
      adultsCount: effectiveAdults,
      childrenCount: effectiveChildren,
      targetCurrency: ctx.currency,
      loyaltyDiscountEGP: pointsValueEGP > 0 ? pointsValueEGP : undefined,
    })

    // 3. Format dynamic prices via localizationService (Currency & Translation Domains)
    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.effectiveBasePrice, ctx)
    const originalPrice = await this.localizationService.formatPrice(snapshot.basePriceEGP, ctx)
    const loyaltyDiscountPrice = pointsValueEGP > 0 ? await this.localizationService.formatPrice(pointsValueEGP, ctx) : undefined

    // 4. Calculate estimated points earned on net paid amount
    const estimatedEarnPoints = this.loyaltyService
      ? await this.loyaltyService.calculateEarnedPoints(snapshot.totalAmountEGP)
      : undefined

    return {
      snapshot,
      subtotalPrice,
      totalCost,
      unitPrice,
      departure,
      originalPrice,
      loyaltyDiscountPrice,
      estimatedEarnPoints,
      remainingLoyaltyPoints,
    }
  }

  /**
   * Preview Pricing for arbitrary date and startTime combinations (Daily Tours or package slot preview).
   */
  async calculatePreview({
    experienceId,
    date,
    startTime,
    adultsCount,
    childrenCount = 0,
    ctx,
    pointsToRedeem,
    customerId,
  }: {
    experienceId: number
    date: string
    startTime: string
    adultsCount: number
    childrenCount?: number
    ctx: LocaleContext
    pointsToRedeem?: number
    customerId?: number
  }): Promise<BookingPricingResult> {
    const departure = await this.experienceService.resolvePreviewDepartureByDate(experienceId, date, startTime)
    if (departure.status === 'blacked_out') {
      throw new Error(`[BookingPricingUseCase] Date ${date}${startTime ? ' at ' + startTime : ''} is unavailable due to blackout.`)
    }
    if (departure.status === 'past') {
      throw new Error(`[BookingPricingUseCase] Date ${date}${startTime ? ' at ' + startTime : ''} has already passed and cannot be booked.`)
    }

    const effectiveAdults = Math.max(1, adultsCount)
    const effectiveChildren = Math.max(0, childrenCount)
    const totalBasePriceEGP = departure.effectiveBasePrice * (effectiveAdults + effectiveChildren)

    // 1. Process Loyalty Points Intent via Domain Validation & Valuation (Fail-Fast)
    let pointsValueEGP = 0
    let remainingLoyaltyPoints: number | undefined = undefined

    if (this.loyaltyService && pointsToRedeem && pointsToRedeem > 0) {
      const activeConfig = await this.loyaltyService.getActiveConfig()

      if (customerId) {
        const settledBalance = await this.loyaltyService.getCustomerBalance(customerId)
        const activeHeldPoints = this.bookingService
          ? await this.bookingService.getActiveHeldPointsForCustomer(customerId)
          : 0
        const availableToRedeem = Math.max(0, settledBalance - activeHeldPoints)

        const validation = PointsCalculator.validateRedemptionAmount(
          pointsToRedeem,
          availableToRedeem,
          totalBasePriceEGP,
          activeConfig,
        )
        if (!validation.allowed) {
          throw new Error(`[PointsCalculator] ${validation.reason}`)
        }
        remainingLoyaltyPoints = Math.max(0, availableToRedeem - pointsToRedeem)
      }

      pointsValueEGP = await this.loyaltyService.calculatePointValueInEGP(pointsToRedeem, activeConfig)
    }

    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.effectiveBasePrice,
      adultsCount: effectiveAdults,
      childrenCount: effectiveChildren,
      targetCurrency: ctx.currency,
      loyaltyDiscountEGP: pointsValueEGP > 0 ? pointsValueEGP : undefined,
    })

    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.effectiveBasePrice, ctx)
    const originalPrice = await this.localizationService.formatPrice(snapshot.basePriceEGP, ctx)
    const loyaltyDiscountPrice = pointsValueEGP > 0 ? await this.localizationService.formatPrice(pointsValueEGP, ctx) : undefined

    const estimatedEarnPoints = this.loyaltyService
      ? await this.loyaltyService.calculateEarnedPoints(snapshot.totalAmountEGP)
      : undefined

    return {
      snapshot,
      subtotalPrice,
      totalCost,
      unitPrice,
      departure,
      originalPrice,
      loyaltyDiscountPrice,
      estimatedEarnPoints,
      remainingLoyaltyPoints,
    }
  }
}
