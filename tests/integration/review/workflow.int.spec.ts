import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus } from '@/types'
import { SessionResolver } from '@/application/auth/session-resolver'
import { submitReviewAction } from '@/application/actions/review-actions'

describe('Review Domain: Integration Workflow & Database unique constraints', () => {
  let payload: any
  let reviewService: any
  let bookingService: any
  let testCustomer: any
  let testExperience: any
  let testCompletedBooking: any
  let testConfirmedBooking: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    reviewService = services.review
    bookingService = services.booking

    // 1. Create a clean test customer
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `review_user_${Date.now()}@example.com`,
        firstName: 'Reviewer',
        lastName: 'Doe',
        status: 'active',
        password: 'password123',
      },
    })

    // 2. Find or create an experience
    const cityRes = await payload.find({ collection: 'cities', limit: 1 })
    const cityId = cityRes.docs.length > 0 ? cityRes.docs[0].id : 1

    testExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: 'Review Trip',
        slug: `review-trip-${Date.now()}`,
        type: 'package',
        packageMode: 'fixed_date',
        city: cityId,
        price: 3000,
        availability: 'available',
        duration: { days: 1, nights: 0 },
      },
    })

    // 3. Create a COMPLETED booking for customer
    testCompletedBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-COMP-${Date.now()}`,
        status: 'completed',
        user: testCustomer.id,
        experience: testExperience.id,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'reviewer@example.com', phone: '12345' }],
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        paymentWindowExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        pricingSnapshot: { basePriceEGP: 3000, subtotalEGP: 3000, displayAmount: 3000, displayCurrency: 'EGP', exchangeRate: 1, totalAmountEGP: 3000, version: 1 },
      },
    })

    // 4. Create a CONFIRMED booking for customer (ineligible for review)
    testConfirmedBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-CONF-${Date.now()}`,
        status: 'confirmed',
        user: testCustomer.id,
        experience: testExperience.id,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'reviewer@example.com', phone: '12345' }],
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        paymentWindowExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        pricingSnapshot: { basePriceEGP: 3000, subtotalEGP: 3000, displayAmount: 3000, displayCurrency: 'EGP', exchangeRate: 1, totalAmountEGP: 3000, version: 1 },
      },
    })
  })

  afterAll(async () => {
    // Cleanup created test records
    await payload.delete({
      collection: 'reviews',
      where: {
        customer: { equals: testCustomer.id },
      },
    })

    await payload.delete({
      collection: 'bookings',
      where: {
        user: { equals: testCustomer.id },
      },
    })

    await payload.delete({
      collection: 'experiences',
      where: {
        id: { equals: testExperience.id },
      },
    })

    await payload.delete({
      collection: 'customers',
      where: {
        id: { equals: testCustomer.id },
      },
    })
  })

  it('should successfully create a review for completed booking', async () => {
    const review = await reviewService.createReview({
      bookingId: testCompletedBooking.id,
      experienceId: testExperience.id,
      customerId: testCustomer.id,
      rating: 5,
      comment: 'Excellent service!',
    })

    expect(review.reviewId).toBeDefined()
    expect(review.rating).toBe(5)
    expect(review.customerId).toBe(testCustomer.id)
    expect(review.bookingId).toBe(testCompletedBooking.id)
  })

  it('should throw REVIEW_ALREADY_EXISTS 409 error on duplicate review creation for same booking', async () => {
    // Attempting to create a duplicate review (one already exists from previous test)
    await expect(
      reviewService.createReview({
        bookingId: testCompletedBooking.id,
        experienceId: testExperience.id,
        customerId: testCustomer.id,
        rating: 4,
        comment: 'Second review!',
      }),
    ).rejects.toThrowError('A review already exists')
  })

  it('should fail with BOOKING_NOT_COMPLETED if booking is confirmed but not completed', async () => {
    await expect(
      reviewService.createReview({
        bookingId: testConfirmedBooking.id,
        experienceId: testExperience.id,
        customerId: testCustomer.id,
        rating: 5,
        comment: 'Nice!',
      }),
    ).rejects.toThrowError('Only bookings in COMPLETED state can be reviewed')
  })

  it('should enforce PostgreSQL UNIQUE index constraint to block race conditions', async () => {
    // 1. Create another completed booking
    const anotherCompletedBooking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-RACE-${Date.now()}`,
        status: 'completed',
        user: testCustomer.id,
        experience: testExperience.id,
        travelers: [{ firstName: 'Race', lastName: 'User', email: 'race@example.com', phone: '123' }],
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        paymentWindowExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        pricingSnapshot: { basePriceEGP: 3000, subtotalEGP: 3000, displayAmount: 3000, displayCurrency: 'EGP', exchangeRate: 1, totalAmountEGP: 3000, version: 1 },
      },
    })

    // 2. Perform two parallel inserts directly to the payload collection bypass service checks to verify PostgreSQL database constraint
    const reviewData = {
      reviewId: `rev_race_1`,
      experience: testExperience.id,
      customer: testCustomer.id,
      booking: anotherCompletedBooking.id,
      rating: 5,
      comment: 'Parallel A',
      status: 'pending_approval',
    }

    // First insert succeeds
    await payload.create({
      collection: 'reviews',
      data: reviewData,
    })

    // Second duplicate insert must fail at db level with unique index exception
    await expect(
      payload.create({
        collection: 'reviews',
        data: {
          ...reviewData,
          reviewId: `rev_race_2`,
          comment: 'Parallel B',
        },
      })
    ).rejects.toThrowError()
  })

  it('should block review submission in submitReviewAction if booking customer does not match session customer', async () => {
    // Mock SessionResolver to return customer 999 (not the owner of completed booking)
    const resolveSpy = vi.spyOn(SessionResolver, 'resolve').mockResolvedValueOnce({
      isAuthenticated: true,
      customerId: 999,
    })

    const initialReviewsCount = await payload.find({
      collection: 'reviews',
      where: {
        booking: { equals: testCompletedBooking.id }
      }
    })

    const actionResult = await submitReviewAction({
      bookingId: testCompletedBooking.id,
      experienceId: testExperience.id,
      rating: 5,
      comment: 'Unauthorized comment'
    })

    expect(actionResult.success).toBe(false)
    expect(actionResult.code).toBe('BOOKING_NOT_OWNED')

    // Assert that no new review was written to the database for this booking
    const finalReviewsCount = await payload.find({
      collection: 'reviews',
      where: {
        booking: { equals: testCompletedBooking.id }
      }
    })
    expect(finalReviewsCount.totalDocs).toBe(initialReviewsCount.totalDocs)

    resolveSpy.mockRestore()
  })
})
