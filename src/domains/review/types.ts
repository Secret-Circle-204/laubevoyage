export interface ReviewAggregate {
  id: number
  reviewId: string
  experienceId: number
  customerId: number
  bookingId: number
  rating: number
  comment: string
  status: 'pending_approval' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface CreateReviewParams {
  bookingId: number
  experienceId: number
  customerId: number
  rating: number
  comment: string
}
