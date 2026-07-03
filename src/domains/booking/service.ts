import { BookingStatus, CurrencyCode, LoyaltyTier, PointTransactionType } from '@/types'
import type { Payload } from 'payload'
import { LoyaltyService } from '../loyalty/service'
import { CurrencyService } from '../currency/service'

/**
 * Booking Domain Service
 * Single source of truth for all booking state transitions
 * CRITICAL: Only this service can change booking status
 */
export class BookingService {
  private payload: Payload
  private loyaltyService: LoyaltyService
  private currencyService: CurrencyService

  // Valid state transitions
  private readonly VALID_TRANSITIONS = [
    BookingStatus.DRAFT,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PAID,
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ]

  constructor(payload: Payload) {
    this.payload = payload
    this.loyaltyService = new LoyaltyService(payload)
    this.currencyService = new CurrencyService(payload)
  }

  /**
   * Create new booking in draft state
   */
  async create(data: {
    userId: number
    experienceId: number
    travelers: Array<{
      firstName: string
      lastName: string
      email: string
      phone: string
      dateOfBirth?: string
      passportNumber?: string
    }>
    startDate: string
    endDate: string
    pointsToRedeem?: number
    currency?: CurrencyCode
  }): Promise<number> {
    const experience = await this.payload.findByID({
      collection: 'experiences',
      id: data.experienceId,
    })

    const user = await this.payload.findByID({
      collection: 'users',
      id: data.userId,
    })

    const basePrice = experience.price
    let pointsRedeemed = 0
    let pointsValue = 0

    // Handle points redemption
    if (data.pointsToRedeem && data.pointsToRedeem > 0) {
      const availablePoints = await this.loyaltyService.getBalance(data.userId)
      if (data.pointsToRedeem > availablePoints) {
        throw new Error('Insufficient loyalty points')
      }
      pointsRedeemed = data.pointsToRedeem
      pointsValue = await this.currencyService.pointsToCurrency(pointsRedeemed, CurrencyCode.EGP)
    }

    const totalAmount = Math.max(0, basePrice - pointsValue)

    const booking = await this.payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: await this.generateBookingNumber(),
        user: data.userId,
        experience: data.experienceId,
        status: 'draft',
        travelers: data.travelers,
        startDate: data.startDate,
        endDate: data.endDate,
        pricing: {
          basePrice,
          pointsRedeemed,
          pointsValue,
          totalAmount,
          currency: data.currency || user.preferences?.currency || CurrencyCode.EGP,
        },
        pointsEarned: 0, // Calculated on confirmation
      },
    })

    return Number(booking.id)
  }

  /**
   * Move booking to pending payment
   */
  async moveToPendingPayment(bookingId: number): Promise<void> {
    await this.transitionStatus(bookingId, BookingStatus.DRAFT, BookingStatus.PENDING_PAYMENT)
  }

  /**
   * Confirm booking after successful payment
   */
  async confirm(bookingId: number, paymentId: string): Promise<void> {
    const booking = await this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })

    // Validate transition
    if (booking.status !== BookingStatus.PAID) {
      throw new Error(`Cannot confirm booking in ${booking.status} status`)
    }

    const userId =
      typeof booking.user === 'object' && booking.user !== null
        ? Number(booking.user.id)
        : Number(booking.user)

    const user = await this.payload.findByID({
      collection: 'users',
      id: userId,
    })

    // Redeem points if any
    if (booking.pricing?.pointsRedeemed && booking.pricing.pointsRedeemed > 0) {
      await this.loyaltyService.redeem(
        userId,
        booking.pricing.pointsRedeemed,
        bookingId,
        `Redeemed for booking ${booking.bookingNumber}`,
      )
    }

    // Calculate points earned
    const tier = (user.loyalty?.tier || 'explorer') as LoyaltyTier
    const pointsEarned = this.loyaltyService.calculateEarnedPoints(
      booking.pricing?.totalAmount || 0,
      tier,
    )

    // Grant earned points
    await this.loyaltyService.earn(
      userId,
      pointsEarned,
      PointTransactionType.EARNED,
      `Earned from booking ${booking.bookingNumber}`,
      bookingId,
    )

    // Update total spent
    const totalSpent = (user.loyalty?.totalSpent || 0) + (booking.pricing?.totalAmount || 0)
    await this.payload.update({
      collection: 'users',
      id: userId,
      data: {
        loyalty: {
          ...user.loyalty,
          totalSpent,
        },
      },
    })

    // Evaluate tier upgrade
    await this.loyaltyService.evaluateTier(userId)

    // Update booking
    await this.payload.update({
      collection: 'bookings',
      id: bookingId,
      data: {
        status: 'confirmed',
        pointsEarned,
        paymentId,
      },
    })
  }

  /**
   * Cancel booking
   */
  async cancel(bookingId: number, reason: string): Promise<void> {
    const booking = await this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })

    const userId =
      typeof booking.user === 'object' && booking.user !== null
        ? Number(booking.user.id)
        : Number(booking.user)

    // Refund redeemed points
    if (booking.pricing?.pointsRedeemed && booking.pricing.pointsRedeemed > 0) {
      await this.loyaltyService.refund(userId, booking.pricing.pointsRedeemed, bookingId)
    }

    // Reverse earned points if confirmed
    if (
      booking.status === BookingStatus.CONFIRMED &&
      booking.pointsEarned &&
      booking.pointsEarned > 0
    ) {
      await this.loyaltyService.reverse(userId, booking.pointsEarned, bookingId)
    }

    await this.payload.update({
      collection: 'bookings',
      id: bookingId,
      data: {
        status: 'cancelled',
        notes: reason,
      },
    })
  }

  /**
   * Complete booking after trip ends
   */
  async complete(bookingId: number): Promise<void> {
    await this.transitionStatus(bookingId, BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
  }

  /**
   * Mark as paid (called by PaymentService)
   */
  async markAsPaid(bookingId: number): Promise<void> {
    await this.transitionStatus(bookingId, BookingStatus.PENDING_PAYMENT, BookingStatus.PAID)
  }

  /**
   * Get booking by ID
   */
  async getById(bookingId: number) {
    return this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: number, page: number = 1, limit: number = 10) {
    return this.payload.find({
      collection: 'bookings',
      where: {
        user: {
          equals: userId,
        },
      },
      sort: '-createdAt',
      page,
      limit,
    })
  }

  /**
   * Validate and perform state transition
   */
  private async transitionStatus(
    bookingId: number,
    from: BookingStatus,
    to: BookingStatus,
  ): Promise<void> {
    const booking = await this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })

    if (booking.status !== from) {
      throw new Error(`Invalid transition: expected ${from}, found ${booking.status}`)
    }

    await this.payload.update({
      collection: 'bookings',
      id: bookingId,
      data: {
        status: to as 'draft' | 'pending_payment' | 'paid' | 'confirmed' | 'completed' | 'cancelled' | 'refunded',
      },
    })
  }

  /**
   * Generate unique booking number
   */
  private async generateBookingNumber(): Promise<string> {
    const prefix = 'LV'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }
}

