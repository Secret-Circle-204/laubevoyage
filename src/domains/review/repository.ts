import type { Payload } from 'payload'
import type { Review } from '@/payload-types'
import type { ReviewAggregate, CreateReviewParams } from './types'

export class ReviewRepository {
  constructor(private payload: Payload) {}

  async hasReviewForBooking(bookingId: number): Promise<boolean> {
    const result = await this.payload.find({
      collection: 'reviews',
      where: {
        booking: { equals: bookingId },
      },
      limit: 1,
    })
    return result.totalDocs > 0
  }

  async create(params: CreateReviewParams): Promise<ReviewAggregate> {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const doc = await this.payload.create({
      collection: 'reviews',
      data: {
        reviewId,
        experience: params.experienceId,
        customer: params.customerId,
        booking: params.bookingId,
        rating: params.rating,
        comment: params.comment,
        status: 'pending_approval',
      },
    })
    return this.mapDocToAggregate(doc)
  }

  private mapDocToAggregate(doc: Review | Record<string, unknown>): ReviewAggregate {
    const r = doc as Review
    const experienceId = typeof r.experience === 'object' && r.experience !== null ? Number(r.experience.id) : Number(r.experience)
    const customerId = typeof r.customer === 'object' && r.customer !== null ? Number(r.customer.id) : Number(r.customer)
    const bookingId = typeof r.booking === 'object' && r.booking !== null ? Number(r.booking.id) : Number(r.booking)

    return {
      id: Number(doc.id),
      reviewId: r.reviewId,
      experienceId,
      customerId,
      bookingId,
      rating: r.rating,
      comment: r.comment,
      status: r.status as any,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }
}
