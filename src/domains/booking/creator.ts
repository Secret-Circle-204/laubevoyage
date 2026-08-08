import type { PayloadRequest } from 'payload'
import { BookingStatus } from '@/types'
import type { BookingAggregate, CreateBookingParams } from './types'
import { BookingRepository } from './repository'
import { BookingPolicy } from './policy'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { BookingNumberGenerator } from './number-generator'
import { LoyaltyService } from '../loyalty/service'
import { PricingPipeline } from '../currency/pipeline'
import type { CustomerRepository } from '../customer/repository'
import { ExperienceService } from '../experience/service'

import { BookingPricingSnapshotAssembler } from './pricing-snapshot-assembler'

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
  private snapshotAssembler: BookingPricingSnapshotAssembler

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
    this.snapshotAssembler = new BookingPricingSnapshotAssembler()
  }

  async createDraft(params: CreateBookingParams, req?: PayloadRequest): Promise<BookingAggregate> {
    const departure = params.departure
    if (!departure || departure.basePriceEGP === undefined) {
      throw new Error(`[BookingCreator] Invalid or unresolved bookable departure read model.`)
    }

    // Fast-path idempotency check
    if (params.idempotencyKey) {
      const existing = await this.repository.getByIdempotencyKey(params.idempotencyKey, req)
      if (existing) {
        // Validate same checkout identity
        const isSameCustomer = existing.customerId === params.userId
        const isSameExperience = existing.experienceId === departure.experienceId

        if (isSameCustomer && isSameExperience) {
          console.log(`[BookingCreator] Fast Path: Found existing booking by idempotency key: ${params.idempotencyKey}. Reusing Booking #${existing.id}`)
          return existing
        } else {
          throw new Error(`[BookingCreator] Idempotency Conflict: Existing booking #${existing.id} found for key "${params.idempotencyKey}" but identity does not match.`)
        }
      }
    }

    console.log(`[BookingCreator] 🏁 Creating booking draft for User #${params.userId}, Experience #${departure.experienceId}, Date: ${departure.date}`);
    const experienceId = departure.experienceId
    const startDate = departure.date

    // 1. Fetch experience and customer via service / repository
    let experience: any
    if (typeof this.experienceService?.getById === 'function') {
      experience = await this.experienceService.getById(experienceId)
    } else {
      experience = await (this.repository as any).payload.findByID({
        collection: 'experiences',
        id: experienceId,
        req,
      })
    }

    let customer: any
    if (typeof this.customerRepository?.findById === 'function') {
      customer = await this.customerRepository.findById(params.userId)
    } else {
      customer = await (this.repository as any).payload.findByID({
        collection: 'customers',
        id: params.userId,
        req,
      })
    }

    // 2. Validate policy
    const policyResult = BookingPolicy.canCreate(
      customer.status || 'active',
      experience.availability,
    )
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Creation forbidden: ${policyResult.reason}`)
    }

    // 3. Handle points redemption and hold via LoyaltyService calculation
    let pointsRedeemed = 0
    let pointsValueEGP = 0
    if (params.pointsToRedeem && params.pointsToRedeem > 0) {
      const availablePoints = await this.loyaltyService.getCustomerBalance(params.userId)
      const pointsPolicy = BookingPolicy.canRedeemPoints(availablePoints, params.pointsToRedeem)
      if (!pointsPolicy.allowed) {
        throw new Error(`[BookingPolicy] Redemption forbidden: ${pointsPolicy.reason}`)
      }
      pointsRedeemed = params.pointsToRedeem
      pointsValueEGP = await this.loyaltyService.calculatePointValueInEGP(pointsRedeemed)
    }

    // 4. Generate Pricing Snapshot using BookingPricingSnapshotAssembler (Single Source of Truth)
    const targetCurrency = params.currency
    if (!targetCurrency) {
      throw new Error(`[BookingCreator] Currency is required for booking creation.`)
    }
    const travelersCount = params.travelers.length || 1
    const totalBasePriceEGP = departure.basePriceEGP * travelersCount

    let pricingSnapshot: any
    if (typeof this.pricingPipeline?.execute === 'function') {
      const { snapshot: calculationResult } = await this.pricingPipeline.execute({
        basePriceEGP: totalBasePriceEGP,
        loyaltyDiscount: pointsValueEGP,
        targetCurrency,
      })
      pricingSnapshot = this.snapshotAssembler.assemble(calculationResult)
    } else {
      pricingSnapshot = {
        basePriceEGP: totalBasePriceEGP,
        totalAmountEGP: totalBasePriceEGP - pointsValueEGP,
        displayCurrency: targetCurrency,
        displayAmount: totalBasePriceEGP - pointsValueEGP,
      }
    }

    // 5. Generate Booking Number
    const bookingNumber = BookingNumberGenerator.generate()

    // 6. Build Initial Timeline & Audit entries
    const customerName =
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      customer.email ||
      'Customer'
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

    // 7. Persist Draft Aggregate in Repository
    const bookingData = {
      bookingNumber,
      user: params.userId,
      experience: experienceId,
      status: BookingStatus.DRAFT,
      travelers: params.travelers,
      startDate: startDate,
      endDate: params.endDate || startDate,
      source: params.source,
      version: 1,
      pricingSnapshot,
      pointsEarned: 0,
      paymentAttempts: [],
      timeline,
      auditTrail,
      documents: {},
      idempotencyKey: params.idempotencyKey,
    }

    const booking = await this.repository.create(bookingData, req)
    console.log(`[BookingCreator] Draft Booking #${booking.id} created successfully with BookingNumber ${bookingNumber}. pricingSnapshot:`, pricingSnapshot);

    // 8. Create Capacity Hold & Point Hold entities
    const seatsCount = params.travelers.length
    if (departure.departureId && typeof this.experienceService?.reserveCapacity === 'function') {
      await this.experienceService.reserveCapacity(
        departure.departureId,
        experienceId,
        seatsCount,
        params.userId,
        booking.id,
        req,
      )
    }

    const capacityHold = CapacityHoldService.createHold({
      bookingId: booking.id,
      customerId: params.userId,
      experienceId: experienceId,
      seats: seatsCount,
      date: startDate,
    })

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
    console.log(`[BookingCreator] CapacityHold & PointHold generated. Finalizing draft for Booking #${booking.id}`);
    return this.repository.update(booking.id, {
      capacityHold,
      pointHold,
    }, req)
  }
}
