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
    slotId?: number
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
    // 1. Resolve BookableDeparture from the domain (slot override or virtual catalog fallback)
    const departure = slotId
      ? await this.experienceService.resolveBookableDepartureBySlot(experienceId, slotId)
      : await this.experienceService.resolveBookableDepartureWithoutSlot(experienceId)

    // 2. Delegate Checkout pricing snapshot calculation to pricingFacade (Pricing Domain)
    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.basePriceEGP,
      adultsCount,
      childrenCount,
      targetCurrency: ctx.currency,
    })

    // 3. Format dynamic prices via localizationService (Currency & Translation Domains)
    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.basePriceEGP, ctx)

    return {
      snapshot,
      subtotalPrice,
      totalCost,
      unitPrice,
      departure,
    }
  }
}
