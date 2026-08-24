import type { ExperienceService } from '@/domains/experience/service'
import type { PricingFacade } from '@/domains/currency/facade'
import type { LocalizationService } from '@/domains/localization/service'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { LocaleContext } from '@/types/locale'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import type { PricingSnapshotData } from '@/domains/currency/pipeline'

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
  ) {}

  /**
   * Calculate and generate pricing snapshot + formatted prices for a given experience slot and passenger configuration.
   * Encapsulates the entire domain coordination (Experience -> Pricing -> Currency -> Formatting).
   */
  async calculate({
    experienceId,
    slotId,
    adultsCount,
    childrenCount,
    ctx,
  }: {
    experienceId: number
    slotId: number
    adultsCount: number
    childrenCount: number
    ctx: LocaleContext
  }): Promise<{
    snapshot: PricingSnapshotData
    subtotalPrice: ConvertedPrice
    totalCost: ConvertedPrice
    unitPrice: ConvertedPrice
    departure: BookableDeparture
  }> {
    if (!slotId) {
      throw new Error(`[BookingPricingUseCase] slotId is required to calculate checkout pricing.`)
    }

    const departure = await this.experienceService.resolveBookableDepartureBySlot(experienceId, slotId)
    if (!departure) {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} not found for experience #${experienceId}.`)
    }
    if (departure.status === 'blacked_out') {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} on ${departure.date} is unavailable due to blackout.`)
    }
    if (departure.status === 'past') {
      throw new Error(`[BookingPricingUseCase] Departure slot #${slotId} on ${departure.date} is in the past and cannot be booked.`)
    }

    // 2. Delegate Checkout pricing snapshot calculation to pricingFacade (Pricing Domain)
    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.effectiveBasePrice,
      adultsCount,
      childrenCount,
      targetCurrency: ctx.currency,
    })

    // 3. Format dynamic prices via localizationService (Currency & Translation Domains)
    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.effectiveBasePrice, ctx)

    return {
      snapshot,
      subtotalPrice,
      totalCost,
      unitPrice,
      departure,
    }
  }

  /**
   * Pure Read-Only Preview Pricing Calculation:
   * Calculates pricing snapshot + formatted prices for a given date and time WITHOUT creating any departure slots in DB.
   * [Pure in-memory domain coordination - Zero DB writes]
   */
  async calculatePreview({
    experienceId,
    date,
    startTime,
    adultsCount,
    childrenCount,
    ctx,
  }: {
    experienceId: number
    date: string
    startTime: string
    adultsCount: number
    childrenCount: number
    ctx: LocaleContext
  }): Promise<{
    snapshot: PricingSnapshotData
    subtotalPrice: ConvertedPrice
    totalCost: ConvertedPrice
    unitPrice: ConvertedPrice
    departure: BookableDeparture
  }> {
    const departure = await this.experienceService.resolvePreviewDepartureByDate(experienceId, date, startTime)
    if (departure.status === 'blacked_out') {
      throw new Error(`[BookingPricingUseCase] Date ${date}${startTime ? ' at ' + startTime : ''} is unavailable due to blackout.`)
    }
    if (departure.status === 'past') {
      throw new Error(`[BookingPricingUseCase] Date ${date}${startTime ? ' at ' + startTime : ''} has already passed and cannot be booked.`)
    }

    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.effectiveBasePrice,
      adultsCount,
      childrenCount,
      targetCurrency: ctx.currency,
    })

    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.effectiveBasePrice, ctx)

    return {
      snapshot,
      subtotalPrice,
      totalCost,
      unitPrice,
      departure,
    }
  }
}
