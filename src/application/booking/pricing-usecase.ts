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
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import type { PackageExperienceAggregate } from '@/domains/experience/aggregate'
import type { OccupancyType } from '@/domains/experience/types'
import { ChildPolicy, type ChildBeddingMode } from '@/domains/experience/child-policy'
import { RoomAllocationPolicy } from '@/domains/experience/room-allocation-policy'
import type { FormattedCommercialBreakdown } from '@/application/experience/dto-details'

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
  commercialBreakdown?: CommercialSnapshotBreakdown
  formattedBreakdown?: FormattedCommercialBreakdown
}

export interface CalculatePricingParams {
  experienceId: number
  slotId?: number
  date?: string
  startTime?: string
  adultsCount: number
  childrenCount?: number
  childAges?: number[]
  childBeddingModes?: ChildBeddingMode[]
  requestedRooms?: number
  ctx: LocaleContext
  pointsToRedeem?: number
  customerId?: number
}

/**
 * Application Use Case to coordinate dynamic checkout and preview pricing.
 * Ensures the entire price flow sequence:
 * (Experience slot resolution -> Child & Room Policy Verification -> Commercial Calculation -> Pricing SSOT Pipeline -> Currency Conversion & Formatting)
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
   */
  async calculate(params: CalculatePricingParams): Promise<BookingPricingResult> {
    if (!params.slotId) {
      throw new Error(`[BookingPricingUseCase] slotId is required to calculate checkout pricing.`)
    }

    const departure = await this.experienceService.resolveBookableDepartureBySlot(
      params.experienceId,
      params.slotId,
    )
    if (!departure) {
      throw new Error(
        `[BookingPricingUseCase] Departure slot #${params.slotId} not found for experience #${params.experienceId}`,
      )
    }
    if (departure.status === 'blacked_out') {
      throw new Error(
        `[BookingPricingUseCase] Departure slot #${params.slotId} on ${departure.date} is unavailable due to blackout.`,
      )
    }
    if (departure.status === 'past') {
      throw new Error(
        `[BookingPricingUseCase] Departure slot #${params.slotId} on ${departure.date} is in the past and cannot be booked.`,
      )
    }

    return this.executeCommercialPricing(departure, params)
  }

  /**
   * Preview Pricing for arbitrary date and startTime combinations (Daily Tours or flexible packages).
   */
  async calculatePreview(params: CalculatePricingParams): Promise<BookingPricingResult> {
    if (!params.date) {
      throw new Error(`[BookingPricingUseCase] date is required for preview pricing.`)
    }

    const departure = await this.experienceService.resolvePreviewDepartureByDate(
      params.experienceId,
      params.date,
      params.startTime || '',
    )
    if (departure.status === 'blacked_out') {
      throw new Error(
        `[BookingPricingUseCase] Date ${params.date}${params.startTime ? ' at ' + params.startTime : ''} is unavailable due to blackout.`,
      )
    }
    if (departure.status === 'past') {
      throw new Error(
        `[BookingPricingUseCase] Date ${params.date}${params.startTime ? ' at ' + params.startTime : ''} has already passed and cannot be booked.`,
      )
    }

    return this.executeCommercialPricing(departure, params)
  }

  /**
   * Core Commercial Pricing Execution (SSOT).
   * Validates pure domain rules and constructs authoritative CommercialSnapshotBreakdown.
   */
  private async executeCommercialPricing(
    departure: BookableDeparture,
    params: CalculatePricingParams,
  ): Promise<BookingPricingResult> {
    const experienceDoc =
      typeof this.experienceService?.getById === 'function'
        ? await this.experienceService.getById(params.experienceId).catch(() => null)
        : null

    const expType = experienceDoc?.type || departure.experienceType || 'daily_tour'

    const effectiveAdults = Math.max(1, params.adultsCount)
    const childAges = params.childAges || []
    const effectiveChildren = Math.max(params.childrenCount || 0, childAges.length)
    const childBeddingModes = params.childBeddingModes || []
    const adultBasePriceEGP = departure.effectiveBasePrice
    const adultsTotalEGP = effectiveAdults * adultBasePriceEGP

    let commercialBreakdown: CommercialSnapshotBreakdown

    if (expType === 'package') {
      const pkg = experienceDoc as PackageExperienceAggregate
      const childrenAllowed = pkg?.childPolicy?.childrenAllowed ?? true

      // 1. Pure Domain Rule: Validate Child Eligibility & Ages
      if (effectiveChildren > 0) {
        const childValidation = ChildPolicy.validate({
          childrenAllowed,
          childAges,
          childBeddingModes,
        })
        if (!childValidation.valid) {
          throw new Error(childValidation.errors.join('; '))
        }
      }

      // 2. Pure Domain Rule: Resolve Supported Room Occupancies (Intersection across Stays)
      let supportedOccupancies: OccupancyType[] = []
      if (Array.isArray(pkg?.accommodations) && pkg.accommodations.length > 0) {
        const enabledPerStay = pkg.accommodations.map((stay) => {
          const set = new Set<OccupancyType>()
          if (Array.isArray(stay.roomRates)) {
            stay.roomRates.forEach((r) => {
              if (r.enabled !== false) {
                set.add(r.occupancy)
              }
            })
          }
          return set
        })

        const firstStayEnabled = enabledPerStay[0] || new Set<OccupancyType>()
        supportedOccupancies = Array.from(firstStayEnabled).filter((occ) =>
          enabledPerStay.every((staySet) => staySet.has(occ)),
        )

        if (supportedOccupancies.length === 0) {
          throw new Error(
            '[BookingPricingUseCase] This package has no mutually compatible room occupancy options across its accommodation stays.',
          )
        }
      } else {
        supportedOccupancies = ['single', 'double', 'triple', 'quad']
      }

      // 3. Pure Domain Rule: Resolve Room Allocation (Smart Assistant Pattern)
      const allocationResult = RoomAllocationPolicy.resolveSmartAllocation({
        adultsCount: effectiveAdults,
        childrenCount: effectiveChildren,
        requestedRooms: params.requestedRooms,
        supportedOccupancies,
      })

      if (!allocationResult.valid) {
        throw new Error(allocationResult.errors.join('; '))
      }

      const roomAllocation = allocationResult.allocation || []

      // 4. Calculate Standalone Accommodation Room Rates across Stays (Admin-controlled values)
      let accommodationTotalEGP = 0
      const staysBreakdown: NonNullable<CommercialSnapshotBreakdown['staysBreakdown']> = []

      if (Array.isArray(pkg?.accommodations) && pkg.accommodations.length > 0) {
        for (const stay of pkg.accommodations) {
          let stayAccommodationTotalEGP = 0
          const appliedRoomRates: NonNullable<CommercialSnapshotBreakdown['staysBreakdown']>[0]['appliedRoomRates'] = []
          const pricingUnit = stay.pricingUnit === 'per_night' ? 'per_night' : 'per_stay'
          const nightsMultiplier = pricingUnit === 'per_night' ? stay.nights : 1

          for (const room of roomAllocation) {
            const rateObj = stay.roomRates?.find((r) => r.occupancy === room.occupancy)
            if (!rateObj || rateObj.enabled === false) {
              throw new Error(
                `[BookingPricingUseCase] Room occupancy "${room.occupancy}" is unavailable at "${stay.property?.name || `Stay #${stay.order}`}".`,
              )
            }

            if (
              rateObj.rateEGP === undefined ||
              rateObj.rateEGP === null ||
              isNaN(Number(rateObj.rateEGP)) ||
              Number(rateObj.rateEGP) < 0
            ) {
              throw new Error(
                `[BookingPricingUseCase] Missing or invalid room rate for "${room.occupancy}" at "${stay.property?.name || `Stay #${stay.order}`}".`,
              )
            }

            const unitRateEGP = Number(rateObj.rateEGP)
            const totalRoomCostEGP = unitRateEGP * nightsMultiplier
            stayAccommodationTotalEGP += totalRoomCostEGP

            appliedRoomRates.push({
              roomIndex: room.roomIndex,
              occupancy: room.occupancy,
              pricingUnit,
              nights: stay.nights,
              unitRateEGP,
              rateEGP: unitRateEGP,
              nightsMultiplier,
              totalRoomCostEGP,
            })
          }

          accommodationTotalEGP += stayAccommodationTotalEGP
          staysBreakdown.push({
            order: stay.order,
            propertyId: stay.propertyId,
            propertyName: stay.property?.name || `Accommodation Stay #${stay.order}`,
            nights: stay.nights,
            roomCategory: stay.roomCategory,
            pricingUnit,
            appliedRoomRates,
            stayAccommodationTotalEGP,
          })
        }
      }

      // 5. Calculate Child Pricing from Admin-configured percentages
      const childrenDetails: NonNullable<CommercialSnapshotBreakdown['children']> = []
      let childrenTotalEGP = 0

      for (let i = 0; i < effectiveChildren; i++) {
        const age = childAges[i] !== undefined ? childAges[i] : 6 // fallback age 6 if count specified without ages
        const category = ChildPolicy.classifyAge(age)

        if (category === 'infant') {
          childrenDetails.push({
            age,
            category: 'infant',
            beddingMode: 'sharing_bed',
            appliedPercentage: 0,
            priceEGP: 0,
          })
        } else if (category === 'child') {
          const mode = childBeddingModes[i] || 'sharing_bed'
          const pct =
            mode === 'extra_bed'
              ? pkg?.childPolicy?.childExtraBedPercentage ?? 75
              : pkg?.childPolicy?.childSharingBedPercentage ?? 50
          const childPriceEGP = Math.round((adultBasePriceEGP * pct) / 100)
          childrenDetails.push({
            age,
            category: 'child',
            beddingMode: mode,
            appliedPercentage: pct,
            priceEGP: childPriceEGP,
          })
          childrenTotalEGP += childPriceEGP
        } else {
          // Age 12+ booked as full adult
          childrenDetails.push({
            age,
            category: 'child',
            beddingMode: 'extra_bed',
            appliedPercentage: 100,
            priceEGP: adultBasePriceEGP,
          })
          childrenTotalEGP += adultBasePriceEGP
        }
      }

      commercialBreakdown = {
        adultsCount: effectiveAdults,
        adultBasePriceEGP,
        adultsTotalEGP,
        requestedRooms: params.requestedRooms || 1,
        effectiveRoomCount: roomAllocation.length,
        minimumRequiredRooms: allocationResult.minimumRequiredRooms || 1,
        roomAllocation,
        roomCount: roomAllocation.length,
        autoAdjusted: allocationResult.autoAdjusted,
        adjustmentMessage: allocationResult.adjustmentReason,
        accommodationTotalEGP,
        children: childrenDetails,
        childrenTotalEGP,
        staysBreakdown,
      }
    } else {
      // Daily Tour Pricing
      commercialBreakdown = {
        adultsCount: effectiveAdults,
        adultBasePriceEGP,
        adultsTotalEGP,
        roomAllocation: [],
        roomCount: 0,
        accommodationTotalEGP: 0,
        children: [],
        childrenTotalEGP: effectiveChildren * adultBasePriceEGP,
      }
    }

    const totalCalculatedBaseEGP =
      commercialBreakdown.adultsTotalEGP +
      commercialBreakdown.accommodationTotalEGP +
      commercialBreakdown.childrenTotalEGP

    // 6. Process Loyalty Points Intent via Domain Validation & Valuation (Fail-Fast)
    let pointsValueEGP = 0
    let remainingLoyaltyPoints: number | undefined = undefined

    if (this.loyaltyService && params.pointsToRedeem && params.pointsToRedeem > 0) {
      const activeConfig = await this.loyaltyService.getActiveConfig()

      if (params.customerId) {
        const settledBalance = await this.loyaltyService.getCustomerBalance(params.customerId)
        const activeHeldPoints = this.bookingService
          ? await this.bookingService.getActiveHeldPointsForCustomer(params.customerId)
          : 0
        const availableToRedeem = Math.max(0, settledBalance - activeHeldPoints)

        const validation = PointsCalculator.validateRedemptionAmount(
          params.pointsToRedeem,
          availableToRedeem,
          totalCalculatedBaseEGP,
          activeConfig,
        )
        if (!validation.allowed) {
          throw new Error(`[PointsCalculator] ${validation.reason}`)
        }
        remainingLoyaltyPoints = Math.max(0, availableToRedeem - params.pointsToRedeem)
      }

      pointsValueEGP = await this.loyaltyService.calculatePointValueInEGP(
        params.pointsToRedeem,
        activeConfig,
      )
    }

    // 7. Delegate to Pricing Domain (Single Financial Pricing SSOT Pipeline)
    const snapshot = await this.pricingFacade.calculateCheckoutSnapshot({
      basePricePerPersonEGP: departure.effectiveBasePrice,
      adultsCount: effectiveAdults,
      childrenCount: effectiveChildren,
      targetCurrency: params.ctx.currency,
      loyaltyDiscountEGP: pointsValueEGP > 0 ? pointsValueEGP : undefined,
      commercialBreakdown,
      departureId: departure.departureId,
      experienceId: params.experienceId,
      bookingDate: departure.date,
    })

    // 8. Format dynamic prices via localizationService
    const subtotalPrice = await this.localizationService.formatPrice(snapshot.subtotalEGP, params.ctx)
    const totalCost = await this.localizationService.formatPrice(snapshot.totalAmountEGP, params.ctx)
    const unitPrice = await this.localizationService.formatPrice(departure.effectiveBasePrice, params.ctx)
    const originalPrice = await this.localizationService.formatPrice(snapshot.basePriceEGP, params.ctx)
    const loyaltyDiscountPrice =
      pointsValueEGP > 0
        ? await this.localizationService.formatPrice(pointsValueEGP, params.ctx)
        : undefined

    const formattedBreakdown: FormattedCommercialBreakdown = {
      adultBasePrice: await this.localizationService.formatPrice(commercialBreakdown.adultBasePriceEGP, params.ctx),
      adultsTotalPrice: await this.localizationService.formatPrice(commercialBreakdown.adultsTotalEGP, params.ctx),
      accommodationTotalPrice: await this.localizationService.formatPrice(commercialBreakdown.accommodationTotalEGP, params.ctx),
      childrenTotalPrice: await this.localizationService.formatPrice(commercialBreakdown.childrenTotalEGP, params.ctx),
      children: await Promise.all(
        (commercialBreakdown.children || []).map(async (ch) => ({
          age: ch.age,
          category: ch.category,
          beddingMode: ch.beddingMode,
          appliedPercentage: ch.appliedPercentage,
          price: await this.localizationService.formatPrice(ch.priceEGP, params.ctx),
        }))
      ),
      staysBreakdown: commercialBreakdown.staysBreakdown && commercialBreakdown.staysBreakdown.length > 0
        ? await Promise.all(
            commercialBreakdown.staysBreakdown.map(async (stay) => ({
              order: stay.order,
              propertyName: stay.propertyName,
              nights: stay.nights,
              roomCategory: stay.roomCategory,
              pricingUnit: stay.pricingUnit,
              stayAccommodationTotalPrice: await this.localizationService.formatPrice(stay.stayAccommodationTotalEGP, params.ctx),
              appliedRoomRates: await Promise.all(
                stay.appliedRoomRates.map(async (rate) => ({
                  roomIndex: rate.roomIndex,
                  occupancy: rate.occupancy,
                  pricingUnit: rate.pricingUnit,
                  nights: rate.nights,
                  unitRatePrice: await this.localizationService.formatPrice(rate.unitRateEGP, params.ctx),
                  totalRoomCostPrice: await this.localizationService.formatPrice(rate.totalRoomCostEGP, params.ctx),
                }))
              ),
            }))
          )
        : undefined,
    }

    // 9. Calculate estimated points earned on net paid amount
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
      commercialBreakdown,
      formattedBreakdown,
    }
  }
}
