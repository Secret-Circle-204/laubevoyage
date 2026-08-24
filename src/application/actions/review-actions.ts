'use server'

import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'

export async function submitReviewAction(params: {
  bookingId: number
  experienceId: number
  rating: number
  comment: string
}) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Authentication required. Please sign in to write a review.' }
    }

    const { review } = await getDomainServices()
    const result = await review.createReview({
      bookingId: params.bookingId,
      experienceId: params.experienceId,
      customerId: session.customerId,
      rating: params.rating,
      comment: params.comment,
    })

    return { success: true, reviewId: result.reviewId }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit review.',
      code: err.code || 'REVIEW_SUBMISSION_FAILED',
    }
  }
}
