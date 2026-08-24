import type { BookingService } from '../booking/service'
import { ReviewRepository } from './repository'
import { ReviewPolicy } from './policy'
import type { ReviewAggregate, CreateReviewParams } from './types'
import type { PolicyResult } from '../booking/types'
import { DomainException } from '../shared/exceptions/domain-exception'

export class ReviewService {
  constructor(
    private repository: ReviewRepository,
    private bookingService: BookingService,
  ) {}

  async checkReviewEligibility(
    customerId: number,
    bookingId: number,
    experienceId: number,
  ): Promise<PolicyResult> {
    const booking = await this.bookingService.getById(bookingId)
    if (!booking) {
      return {
        allowed: false,
        code: 'BOOKING_NOT_FOUND',
        reason: `Booking #${bookingId} not found.`,
      }
    }

    const policyResult = ReviewPolicy.canReview(booking, customerId, experienceId)
    if (!policyResult.allowed) {
      return policyResult
    }

    const hasReview = await this.repository.hasReviewForBooking(bookingId)
    if (hasReview) {
      return {
        allowed: false,
        code: 'REVIEW_ALREADY_EXISTS',
        reason: `A review already exists for Booking #${bookingId}.`,
      }
    }

    return { allowed: true }
  }

  async createReview(params: CreateReviewParams): Promise<ReviewAggregate> {
    const eligibility = await this.checkReviewEligibility(
      params.customerId,
      params.bookingId,
      params.experienceId,
    )

    if (!eligibility.allowed) {
      throw new DomainException(
        eligibility.reason || 'Booking is not eligible for review.',
        eligibility.code || 'REVIEW_INELIGIBLE',
        eligibility.code === 'REVIEW_ALREADY_EXISTS' ? 409 : 400,
      )
    }

    try {
      return await this.repository.create(params)
    } catch (err: unknown) {
      const msg = String(err)
      const isDuplicate =
        msg.includes('duplicate key') ||
        msg.includes('unique constraint') ||
        msg.includes('Value must be unique')

      if (isDuplicate) {
        throw new DomainException(
          `A review already exists for Booking #${params.bookingId}.`,
          'REVIEW_ALREADY_EXISTS',
          409,
        )
      }
      throw err
    }
  }
}
