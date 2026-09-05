import { BookingStatus } from '@/types'
import type { RequestContext } from '@/types'
import type { BookingAggregate, CreateBookingParams } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { BookingNumberGenerator } from './number-generator'
import { LoyaltyService } from '../loyalty/service'
import {
  PricingPipeline,
  type PricingSnapshotData,
  type PricingContext,
} from '../currency/pipeline'
import type { CustomerRepository } from '../customer/repository'
import { ExperienceService } from '../experience/service'
import { BlackoutPolicy } from '../experience/blackout-policy'
import { ExperiencePolicy } from '../experience/policy'
import { resolveTripCompletionInstant } from './trip-completion-resolver'
import type { ExperienceAggregate } from '../experience/aggregate'
import type { CustomerAggregate } from '../customer/aggregate'
import type { Customer } from '@/payload-types'
import { addDaysToDateString } from '@/lib/date'
import type { BookableDeparture } from '../experience/bookable-departure'

interface IPricingPipeline {
  calculatePricingSnapshot?(
    basePriceEGP: number,
    context: PricingContext,
    discounts?: { loyalty?: number; promotion?: number; coupon?: number },
  ): Promise<PricingSnapshotData>
  calculate?(params: {
    experienceId: number
    departure: BookableDeparture
    travelers: unknown[]
    pointsRedeemed: number
    pointsValueEGP: number
    targetCurrency: string
  }): Promise<PricingSnapshotData>
}

/**
 * Booking Creator Sub-Service
 * Handles the creation of new booking drafts with seat capacity locks, loyalty point holds, and pricing snapshots.
 */
export class BookingCreator {
  private repository: BookingRepository
  private customerRepository: CustomerRepository
  private experienceService: ExperienceService
  private loyaltyService: LoyaltyService
  private pricingPipeline: PricingPipeline

  constructor(
    repository: BookingRepository,
    customerRepository: CustomerRepository,
    experienceService: ExperienceService,
    loyaltyService: LoyaltyService,
    pricingPipeline: PricingPipeline,
  ) {
    this.repository = repository
    this.customerRepository = customerRepository
    this.experienceService = experienceService
    this.loyaltyService = loyaltyService
    this.pricingPipeline = pricingPipeline
  }

  async createDraft(
    params: CreateBookingParams,
    context?: RequestContext,
  ): Promise<BookingAggregate> {
    const departure = params.departure
    if (!departure || departure.effectiveBasePrice === undefined) {
      throw new Error(`[BookingCreator] Invalid or unresolved bookable departure read model.`)
    }

    console.log(
      `[BookingCreator] 🏁 Creating booking draft for User #${params.userId}, Experience #${departure.experienceId}, Date: ${departure.date}`,
    )
    const experienceId = departure.experienceId
    const startDate = departure.date
    const payloadReq =
      context && context.transactionId ? { transactionID: context.transactionId } : undefined

    // 1. Fetch experience and customer via service / repository
    const experience: ExperienceAggregate = await this.experienceService.getById(experienceId)
    if (!experience) {
      throw new Error(`[BookingCreator] Experience #${experienceId} not found.`)
    }

    const customer = await this.customerRepository.findById(params.userId)
    if (!customer) {
      throw new Error(`[BookingCreator] Customer #${params.userId} not found.`)
    }
    const customerStatus = customer.status
    if (!customerStatus) {
      throw new Error(
        `[BookingCreator] Customer #${params.userId} is missing authoritative account status.`,
      )
    }

    const expAvailability = experience.availability
    if (!expAvailability) {
      throw new Error(
        `[BookingCreator] Experience #${experienceId} is missing authoritative availability status.`,
      )
    }

    const destinationTimezone = await this.experienceService.getDestinationTimezone(
      experienceId,
      context,
    )
    if (!destinationTimezone) {
      throw new Error(
        `[BookingCreator] Cannot create draft: Failed to resolve authoritative destination timezone for Experience #${experienceId}`,
      )
    }

    const expType = experience.type
    const durationMinutes =
      experience.type === 'daily_tour' ? experience.durationMinutes : undefined

    let calendarEndDate = startDate
    if (experience.type === 'package') {
      if (params.endDate) {
        calendarEndDate = params.endDate
      } else if (experience.durationDays && experience.durationDays > 0) {
        calendarEndDate = addDaysToDateString(startDate, experience.durationDays - 1)
      } else {
        throw new Error(
          `[BookingCreator] Cannot create package draft: Missing required endDate or durationDays for Experience #${experienceId}`,
        )
      }
    }

    const bookabilityCheck = ExperiencePolicy.isDepartureBookable({
      type: expType,
      date: startDate,
      startTime: departure.startTime || undefined,
      durationMinutes,
      endDate: calendarEndDate,
      timezone: destinationTimezone,
    })

    const policyResult = BookingPolicy.canCreate(customerStatus, expAvailability, bookabilityCheck)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Creation forbidden: ${policyResult.reason}`)
    }

    // 2b. Validate Blackout Policy (Hard Server-Side Invariant)
    const expBlackouts = (experience as ExperienceAggregate).blackouts || []
    const blackoutCheck = BlackoutPolicy.isDateBlackedOut(
      startDate,
      departure.startTime,
      expBlackouts,
    )
    if (!blackoutCheck.allowed) {
      throw new Error(`[BookingCreator] Creation forbidden: ${blackoutCheck.reason}`)
    }

    // 3. Handle points redemption and hold with strict Atomic Concurrency & Invariant Enforcement
    let pointsRedeemed = 0
    let pointsValueEGP = 0
    if (params.pointsToRedeem && params.pointsToRedeem > 0) {
      // Step 1: Acquire exclusive customer row lock inside active transaction to serialize concurrent checkout attempts
      await this.repository.acquireCustomerLock(params.userId, context)

      // Step 2: Read settled ledger balance and active uncommitted booking holds
      const settledBalance = await this.loyaltyService.getCustomerBalance(params.userId, context)
      const activeHeldPoints = await this.repository.getActiveHeldPointsForCustomer(params.userId, context)
      const availableToRedeem = Math.max(0, settledBalance - activeHeldPoints)

      // Step 3: Validate available spendable points via BookingPolicy
      const pointsPolicy = BookingPolicy.canRedeemPoints(availableToRedeem, params.pointsToRedeem)
      if (!pointsPolicy.allowed) {
        throw new Error(`[BookingPolicy] Redemption forbidden: ${pointsPolicy.reason}`)
      }
      pointsRedeemed = params.pointsToRedeem
      pointsValueEGP = await this.loyaltyService.calculatePointValueInEGP(pointsRedeemed)
    }

    // 4. Validate Passenger Manifest Invariants via BookingPolicy
    const expectedAdults =
      params.commercialBreakdown?.adultsCount ??
      (params.travelers.filter((t: any) => t.type !== 'child' && t.type !== 'infant').length ||
        params.travelers.length)
    const expectedChildren =
      params.commercialBreakdown?.children?.length ??
      params.travelers.filter((t: any) => t.type === 'child' || t.type === 'infant').length

    const manifestPolicy = BookingPolicy.validateTravelersManifest(
      params.travelers,
      expectedAdults,
      expectedChildren,
    )
    if (!manifestPolicy.allowed) {
      throw new Error(`[BookingCreator] ${manifestPolicy.reason}`)
    }

    // 5. Authoritative Pricing Snapshot Verification (SSOT Enforcement - No Fallback Pricing)
    let pricingSnapshot: any

    if (params.pricingSnapshot) {
      pricingSnapshot = params.pricingSnapshot
      // Invariant: One calculated result -> one authoritative representation.
      if (params.commercialBreakdown && !pricingSnapshot.commercialBreakdown) {
        pricingSnapshot.commercialBreakdown = params.commercialBreakdown
      }
    } else {
      const pipeline = this.pricingPipeline as unknown as IPricingPipeline
      if (typeof pipeline?.calculatePricingSnapshot === 'function') {
        const totalBasePriceEGP =
          params.commercialBreakdown?.adultsTotalEGP !== undefined
            ? params.commercialBreakdown.adultsTotalEGP +
              (params.commercialBreakdown.occupancySupplementsTotalEGP || 0) +
              (params.commercialBreakdown.childrenTotalEGP || 0)
            : departure.effectiveBasePrice * params.travelers.length

        pricingSnapshot = await pipeline.calculatePricingSnapshot(
          totalBasePriceEGP,
          {
            departureId: departure.departureId,
            experienceId: experienceId,
            displayCurrency: params.currency || 'EGP',
            travelers: { adults: params.travelers.length },
            bookingDate: startDate,
            commercialBreakdown: params.commercialBreakdown,
          },
          {
            loyalty: pointsValueEGP,
          },
        )
      } else {
        throw new Error(
          `[BookingCreator] Missing authoritative pricingSnapshot for experience #${experienceId}. BookingCreator has no fallback pricing algorithm.`,
        )
      }
    }

    // 5. Generate human-readable booking number (LBV-YYMMDD-XXXXX) in destination timezone
    const bookingNumber = BookingNumberGenerator.generate(destinationTimezone)

    // 6. Initialize Customer Timeline and System Audit Trail
    const customerAgg = customer as CustomerAggregate
    const customerDoc = customer as unknown as Customer
    const customerName =
      customerAgg.firstName && customerAgg.lastName
        ? `${customerAgg.firstName} ${customerAgg.lastName}`
        : customerDoc.firstName && customerDoc.lastName
          ? `${customerDoc.firstName} ${customerDoc.lastName}`
          : customerAgg.email || customerDoc.email || 'Customer'

    const actor = params.actor || { id: params.userId, type: 'customer', name: customerName }

    const timeline = BookingHistoryService.appendTimelineEntry([], {
      stepKey: 'booking_created',
      title: 'Booking Created',
      description:
        'Your booking draft has been initialized. Complete payment to confirm your trip.',
    })

    const auditTrail = BookingHistoryService.appendAuditEntry([], {
      actor,
      action: 'BOOKING_CREATED',
      reason: 'Customer initiated checkout',
      newValue: BookingStatus.DRAFT,
    })

    // 7. Resolve Departure Slot (Strictly for Fixed Packages with physical inventory)
    const expPackageMode = experience.type === 'package' ? experience.packageMode : undefined
    const isSlotLess =
      experience.type === 'daily_tour' ||
      (experience.type === 'package' && expPackageMode === 'flexible_date')
    const slotId =
      !isSlotLess && departure.id && typeof departure.id === 'number' ? departure.id : null
    const departureId =
      !isSlotLess && slotId && departure.departureId ? departure.departureId : null

    // 8. Compute frozen operational completion instant
    const completionInstant = resolveTripCompletionInstant({
      type: expType,
      startDate,
      endDate: calendarEndDate,
      startTime: departure.startTime || undefined,
      durationMinutes,
      timezone: destinationTimezone,
    })
    const completionAt = completionInstant.toISOString()

    const createdAtInstant = new Date()
    const paymentWindowExpiresAt =
      BookingPolicy.calculatePaymentWindowExpiresAt(createdAtInstant).toISOString()

    const bookingData = {
      bookingNumber,
      user: params.userId,
      experience: experienceId,
      departureSlot: slotId,
      status: BookingStatus.DRAFT,
      travelers: params.travelers,
      startDate: startDate,
      endDate: calendarEndDate,
      completionAt,
      destinationTimezone,
      paymentWindowExpiresAt,
      source: params.source,
      version: 1,
      pricingSnapshot,
      pointsEarned: 0,
      paymentAttempts: [],
      paymentStatus: 'unpaid',
      amountPaid: 0,
      outstandingBalance: pricingSnapshot.totalAmountEGP,
      timeline,
      auditTrail,
      documents: {},
      pickupLocation: params.pickupLocation || null,
      idempotencyKey: params.idempotencyKey,
    }

    const booking = await this.repository.create(bookingData, context)
    console.log(
      `[BookingCreator] Draft Booking #${booking.id} created successfully with BookingNumber ${bookingNumber}. slotId: ${slotId || 'null (slot-less)'}`,
    )

    // 8. Create Capacity Hold & Point Hold entities
    const seatsCount = params.travelers.length
    let capacityHold = null
    if (departureId && slotId) {
      await this.experienceService.reserveCapacity(
        departureId,
        experienceId,
        seatsCount,
        params.userId,
        booking.id,
        context,
      )

      capacityHold = CapacityHoldService.createHold({
        bookingId: booking.id,
        customerId: params.userId,
        experienceId: experienceId,
        departureId: departureId,
        departureSlotId: slotId,
        seats: seatsCount,
        date: startDate,
      })
    }

    let pointHold = null
    if (pointsRedeemed > 0) {
      pointHold = PointHoldService.createHold({
        bookingId: booking.id,
        customerId: params.userId,
        pointsHeld: pointsRedeemed,
        valueEGP: pointsValueEGP,
      })
    }

    // 9. Update Aggregate with Hold Entities
    console.log(
      `[BookingCreator] CapacityHold & PointHold generated. Finalizing draft for Booking #${booking.id}`,
    )
    return this.repository.update(
      booking.id,
      {
        capacityHold,
        pointHold,
      },
      context,
    )
  }
}
