import { describe, it, expect } from 'vitest'
import { ReviewPolicy } from '@/domains/review/policy'
import { BookingStatus } from '@/types'
import type { BookingAggregate } from '@/domains/booking/types'

describe('Review Domain: ReviewPolicy Unit Tests', () => {
  const baseBooking: BookingAggregate = {
    id: 101,
    bookingNumber: 'BK-12345',
    version: 1,
    source: 'website',
    status: BookingStatus.COMPLETED,
    customerId: 5,
    experienceId: 10,
    travelers: [],
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    completionAt: '2026-08-05T12:00:00Z',
    paymentWindowExpiresAt: '2026-07-22T12:15:00.000Z',
    pricingSnapshot: {} as any,
    pointsEarned: 0,
    timeline: [],
    auditTrail: [],
    documents: {},
    metadata: {},
    capacityHold: null,
    pointHold: null,
    paymentAttempts: [],
    createdAt: '2026-07-22T12:00:00Z',
    updatedAt: '2026-07-22T12:00:00Z',
  }

  it('should approve review if booking is COMPLETED, customer matches, and experience matches', () => {
    const result = ReviewPolicy.canReview(baseBooking, 5, 10)
    expect(result.allowed).toBe(true)
  })

  it('should reject review with BOOKING_NOT_OWNED if customerId does not match', () => {
    const result = ReviewPolicy.canReview(baseBooking, 999, 10)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('BOOKING_NOT_OWNED')
  })

  it('should reject review with EXPERIENCE_MISMATCH if experienceId does not match', () => {
    const result = ReviewPolicy.canReview(baseBooking, 5, 999)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('EXPERIENCE_MISMATCH')
  })

  const forbiddenStatuses = [
    BookingStatus.DRAFT,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PAID,
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.REFUNDED,
    BookingStatus.EXPIRED,
    BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY,
  ]

  forbiddenStatuses.forEach((status) => {
    it(`should reject review with BOOKING_NOT_COMPLETED if booking status is ${status}`, () => {
      const booking = { ...baseBooking, status }
      const result = ReviewPolicy.canReview(booking, 5, 10)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('BOOKING_NOT_COMPLETED')
    })
  })
})
