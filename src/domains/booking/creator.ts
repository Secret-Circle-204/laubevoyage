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
import { CustomerRepository } from '../customer/repository'
import { ExperienceRepository } from '../experience/repository'

/**
 * Booking Creator Sub-Service
 * Handles the creation of new booking drafts with seat capacity locks, loyalty point holds, and pricing snapshots.
 */
export class BookingCreator {
  private repository: BookingRepository
  private customerRepository: CustomerRepository
  private experienceRepository: ExperienceRepository
  private loyaltyService: LoyaltyService
  private pricingPipeline: PricingPipeline

  constructor(
    repository: BookingRepository,
    customerRepository: CustomerRepository,
    experienceRepository: ExperienceRepository,
    loyaltyService: LoyaltyService,
  ) {
    this.repository = repository
    this.customerRepository = customerRepository
    this.experienceRepository = experienceRepository
    this.loyaltyService = loyaltyService
    this.pricingPipeline = new PricingPipeline()
  }

  async createDraft(params: CreateBookingParams): Promise<BookingAggregate> {
    // 1. Fetch experience and customer via repositories
    const experience = await this.experienceRepository.findById(params.experienceId)
    const customer = await this.customerRepository.findById(params.userId)

    // 2. Validate policy
    const policyResult = BookingPolicy.canCreate(customer.status || 'active', experience.availability)
    if (!policyResult.allowed) {
      throw new Error(`[BookingPolicy] Creation forbidden: ${policyResult.reason}`)
    }

    // 3. Handle points redemption and hold via LoyaltyService calculation
    let pointsRedeemed = 0
    let pointsValueEGP = 0
    if (params.pointsToRedeem && params.pointsToRedeem > 0) {
      const availablePoints = await this.loyaltyService.getBalance(params.userId)
      const pointsPolicy = BookingPolicy.canRedeemPoints(availablePoints, params.pointsToRedeem)
      if (!pointsPolicy.allowed) {
        throw new Error(`[BookingPolicy] Redemption forbidden: ${pointsPolicy.reason}`)
      }
      pointsRedeemed = params.pointsToRedeem
      pointsValueEGP = this.loyaltyService.calculatePointValueInEGP(pointsRedeemed)
    }

    // 4. Generate Pricing Snapshot
    const targetCurrency = params.currency || 'EGP'
    const { snapshot } = await this.pricingPipeline.execute({
      basePriceEGP: experience.basePriceEGP,
      loyaltyDiscount: pointsValueEGP,
      targetCurrency,
    })

    // 5. Generate Booking Number
    const bookingNumber = BookingNumberGenerator.generate()

    // 6. Build Initial Timeline & Audit entries
    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Customer'
    const actor = params.actor || { id: params.userId, type: 'customer', name: customerName }

    const timeline = BookingHistoryService.appendTimelineEntry([], {
      stepKey: 'booking_created',
      title: 'Booking Created',
      description: 'Your booking draft has been initialized. Complete payment to confirm your trip.',
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
      experience: params.experienceId,
      status: BookingStatus.DRAFT,
      travelers: params.travelers,
      startDate: params.startDate,
      endDate: params.endDate,
      source: params.source || 'website',
      version: 1,
      pricingSnapshot: {
        ...snapshot,
        exchangeRateTimestamp: typeof snapshot.exchangeRateTimestamp === 'string'
          ? snapshot.exchangeRateTimestamp
          : (snapshot.exchangeRateTimestamp as any)?.toISOString?.() || new Date().toISOString(),
      },
      pointsEarned: 0,
      paymentAttempts: [],
      timeline,
      auditTrail,
      documents: {},
    }

    const booking = await this.repository.create(bookingData)

    // 8. Create Capacity Hold & Point Hold entities
    const seatsCount = params.travelers.length
    const capacityHold = CapacityHoldService.createHold({
      bookingId: booking.id,
      customerId: params.userId,
      experienceId: params.experienceId,
      seats: seatsCount,
      date: params.startDate,
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
    return this.repository.update(booking.id, {
      capacityHold,
      pointHold,
    })
  }
}
