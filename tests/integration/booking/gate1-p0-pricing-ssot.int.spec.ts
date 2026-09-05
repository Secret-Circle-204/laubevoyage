import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { BookingPricingUseCase } from '@/application/booking/pricing-usecase'
import { SessionResolver } from '@/application/auth/session-resolver'
import { BookingCreator } from '@/domains/booking/creator'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import type { PackageExperienceAggregate } from '@/domains/experience/aggregate'

// Mock session resolver
vi.mock('@/application/auth/session-resolver', () => ({
  SessionResolver: {
    resolve: vi.fn(),
  },
}))

// Mock cookies and headers for Next.js server actions
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) => {
      if (name === 'laube-currency') return { value: 'EGP' }
      if (name === 'laube-locale') return { value: 'en' }
      return undefined
    }),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
}))

describe('Gate 1: P0 Financial SSOT & Checkout Integrity Matrix', () => {
  // Configured Real-World Baseline based on Experience #693
  const BASE_PRICE_EGP = 12500
  const SINGLE_SUPPLEMENT_EGP = 3000
  const TRIPLE_SUPPLEMENT_EGP = -1000
  const QUAD_SUPPLEMENT_EGP = -1500
  const CHILD_SHARING_PCT = 50
  const CHILD_EXTRA_BED_PCT = 75
  const LOYALTY_REDEMPTION_UNIT = 100
  const LOYALTY_REDEMPTION_VALUE_EGP = 20 // 0.20 EGP per point

  const mockExperience693: PackageExperienceAggregate = {
    id: 693,
    title: 'Cairo and Nile Express - 3 Days Luxury Fixed Package',
    slug: 'cairo-nile-express-3-days-fixed',
    type: 'package',
    packageMode: 'fixed_date',
    durationDays: 3,
    durationNights: 2,
    price: BASE_PRICE_EGP,
    availability: 'available',
    isActive: true,
    cityId: 1,
    blackouts: [],
    childPolicy: {
      childrenAllowed: true,
      minChildAge: 2,
      maxChildAge: 11,
      childSharingBedPercentage: CHILD_SHARING_PCT,
      childExtraBedPercentage: CHILD_EXTRA_BED_PCT,
    },
    accommodations: [
      {
        order: 1,
        propertyId: 10,
        nights: 2,
        roomCategory: 'Deluxe Nile View Suite',
        boardBasis: 'Bed & Breakfast',
        occupancyOptions: [
          { occupancy: 'single', supplementEGP: SINGLE_SUPPLEMENT_EGP },
          { occupancy: 'double', supplementEGP: 0 },
          { occupancy: 'triple', supplementEGP: TRIPLE_SUPPLEMENT_EGP },
          { occupancy: 'quad', supplementEGP: QUAD_SUPPLEMENT_EGP },
        ],
      },
    ],
  } as any

  const mockDepartureSlot768: BookableDeparture = {
    departureId: 'dep_slot_768',
    id: 768,
    experienceId: 693,
    experienceTitle: mockExperience693.title,
    date: '2026-10-15',
    startTime: '09:00',
    effectiveBasePrice: BASE_PRICE_EGP,
    experienceType: 'package',
    status: 'available',
    capacityAvailable: 20,
    capacityTotal: 20,
  }

  let capturedCreatedDraft: any = null
  let mockPaymentCheckoutUrl: string = ''

  // Mock application services and dependencies
  vi.mock('@/application/factory', () => ({
    getApplicationServices: vi.fn(),
  }))

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedCreatedDraft = null
    mockPaymentCheckoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_gate1_session'

    // Mock authenticated customer by default (Customer #768)
    vi.mocked(SessionResolver.resolve).mockResolvedValue({
      isAuthenticated: true,
      role: 'customer',
      customerId: 768,
      userId: undefined,
      email: 'traveler@example.com',
    })

    // Setup domain mocks for getApplicationServices
    const { getApplicationServices } = await import('@/application/factory')

    const mockExperienceService: any = {
      getById: vi.fn().mockResolvedValue(mockExperience693),
      resolveBookableDepartureBySlot: vi.fn().mockResolvedValue(mockDepartureSlot768),
      resolvePreviewDepartureByDate: vi.fn().mockResolvedValue(mockDepartureSlot768),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
    }

    const mockPricingFacade: any = {
      calculateCheckoutSnapshot: vi.fn().mockImplementation((params) => {
        const totalBase = params.commercialBreakdown
          ? params.commercialBreakdown.adultsTotalEGP +
            params.commercialBreakdown.occupancySupplementsTotalEGP +
            params.commercialBreakdown.childrenTotalEGP
          : params.basePricePerPersonEGP * params.adultsCount

        const loyaltyDiscount = params.loyaltyDiscountEGP || 0
        const finalAmount = Math.max(0, totalBase - loyaltyDiscount)

        return Promise.resolve({
          snapshotId: `snap_test_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: totalBase,
          loyaltyDiscountEGP: loyaltyDiscount,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: finalAmount,
          taxes: 0,
          fees: 0,
          totalAmountEGP: finalAmount,
          displayCurrency: params.targetCurrency || 'EGP',
          displayAmount: finalAmount,
          exchangeRate: 1.0,
          exchangeRateTimestamp: new Date().toISOString(),
          commercialBreakdown: params.commercialBreakdown,
          auditTrace: [],
          calculatedAt: new Date().toISOString(),
        })
      }),
    }

    const mockLocalizationService: any = {
      buildContext: vi.fn().mockResolvedValue({
        locale: 'en',
        language: 'en',
        currency: 'EGP',
        isRTL: false,
      }),
      formatPrice: vi.fn().mockImplementation((amount, ctx) =>
        Promise.resolve({
          baseAmountEGP: amount,
          convertedAmount: amount,
          currencyCode: ctx.currency || 'EGP',
          currencySymbol: 'EGP',
          formatted: `${amount.toLocaleString()} EGP`,
          exchangeRate: 1.0,
          decimals: 2,
        }),
      ),
    }

    const mockLoyaltyService: any = {
      getActiveConfig: vi.fn().mockResolvedValue({
        redemptionPointsUnit: LOYALTY_REDEMPTION_UNIT,
        redemptionValueEGP: LOYALTY_REDEMPTION_VALUE_EGP,
        maxRedemptionPercent: 50,
      }),
      getCustomerBalance: vi.fn().mockResolvedValue(5000), // 5,000 points = 1,000 EGP
      calculatePointValueInEGP: vi.fn().mockImplementation((points) => {
        return Math.floor(points / LOYALTY_REDEMPTION_UNIT) * LOYALTY_REDEMPTION_VALUE_EGP
      }),
      calculateEarnedPoints: vi.fn().mockResolvedValue(250),
    }

    const mockBookingService: any = {
      getByIdempotencyKey: vi.fn().mockResolvedValue(null),
      getActiveHeldPointsForCustomer: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation((params) => {
        capturedCreatedDraft = params
        return Promise.resolve(14850)
      }),
      moveToPendingPayment: vi.fn().mockResolvedValue(undefined),
      moveToPendingAdminReview: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn().mockImplementation((id) =>
        Promise.resolve({
          id,
          bookingNumber: 'LBV-261015-14850',
          status: 'pending_payment',
          customerId: 768,
          pricingSnapshot: capturedCreatedDraft?.pricingSnapshot,
        }),
      ),
    }

    const mockPaymentService: any = {
      processPaymentCheckout: vi.fn().mockImplementation((params) => {
        return Promise.resolve({
          success: true,
          transactionId: 'tx_gate1_stripe_001',
          checkoutUrl: mockPaymentCheckoutUrl,
        })
      }),
    }

    const mockPayload: any = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_gate1_db'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }

    const pricingUseCase = new BookingPricingUseCase(
      mockExperienceService,
      mockPricingFacade,
      mockLocalizationService,
      mockLoyaltyService,
      mockBookingService,
    )

    vi.mocked(getApplicationServices).mockResolvedValue({
      experience: mockExperienceService,
      pricingFacade: mockPricingFacade,
      localization: mockLocalizationService,
      loyalty: mockLoyaltyService,
      booking: mockBookingService,
      payment: mockPaymentService,
      payload: mockPayload,
      bookingPricingUseCase: pricingUseCase,
    } as any)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FINANCIAL & COMMERCIAL MATRIX (DERIVED DIRECTLY FROM DOMAIN CONFIG)
  // ──────────────────────────────────────────────────────────────────────────

  it('Scenario 1: Single Occupancy — 1 Adult in Single Room (Includes Supplement)', async () => {
    // Domain Rule: 1 Adult in single room pays base price + single supplement
    const expectedSupplement = SINGLE_SUPPLEMENT_EGP
    const expectedTotal = BASE_PRICE_EGP + expectedSupplement // 12,500 + 3,000 = 15,500

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 1,
      travelers: [
        { type: 'adult', firstName: 'Jane', lastName: 'Solo', email: 'jane@example.com' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_single_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft).toBeDefined()
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.occupancySupplementsTotalEGP,
    ).toBe(expectedSupplement)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.roomAllocation[0].occupancy).toBe(
      'single',
    )
  })

  it('Scenario 2: Double Occupancy — 2 Adults in 1 Double Room (Zero Supplement Baseline)', async () => {
    // Domain Rule: Double occupancy is the zero supplement baseline
    const expectedTotal = 2 * BASE_PRICE_EGP // 25,000

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      travelers: [
        { type: 'adult', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { type: 'adult', firstName: 'Mary', lastName: 'Doe', email: 'mary@example.com' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_double_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.occupancySupplementsTotalEGP,
    ).toBe(0)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.roomAllocation[0].occupancy).toBe(
      'double',
    )
  })

  it('Scenario 3: Triple Occupancy — 3 Adults in 1 Triple Room (Triple Discount Applied)', async () => {
    const expectedSupplement = TRIPLE_SUPPLEMENT_EGP // -1,000
    const expectedTotal = 3 * BASE_PRICE_EGP + expectedSupplement // 37,500 - 1,000 = 36,500

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 3,
      requestedRooms: 1,
      travelers: [
        { type: 'adult', firstName: 'A', lastName: 'T' },
        { type: 'adult', firstName: 'B', lastName: 'T' },
        { type: 'adult', firstName: 'C', lastName: 'T' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_triple_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.occupancySupplementsTotalEGP,
    ).toBe(expectedSupplement)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.roomAllocation[0].occupancy).toBe(
      'triple',
    )
  })

  it('Scenario 4: Quad Occupancy — 4 Adults in 1 Quad Room (Quad Discount Applied)', async () => {
    const expectedSupplement = QUAD_SUPPLEMENT_EGP // -1,500
    const expectedTotal = 4 * BASE_PRICE_EGP + expectedSupplement // 50,000 - 1,500 = 48,500

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 4,
      requestedRooms: 1,
      travelers: [
        { type: 'adult', firstName: 'A', lastName: 'Q' },
        { type: 'adult', firstName: 'B', lastName: 'Q' },
        { type: 'adult', firstName: 'C', lastName: 'Q' },
        { type: 'adult', firstName: 'D', lastName: 'Q' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_quad_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.occupancySupplementsTotalEGP,
    ).toBe(expectedSupplement)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.roomAllocation[0].occupancy).toBe(
      'quad',
    )
  })

  it('Scenario 5: Multiple Rooms — 3 Adults in 2 Rooms (1 Double + 1 Single)', async () => {
    // 3 adults across 2 rooms -> 1 Double (0 supplement) + 1 Single (3,000 supplement)
    const expectedSupplement = SINGLE_SUPPLEMENT_EGP
    const expectedTotal = 3 * BASE_PRICE_EGP + expectedSupplement // 37,500 + 3,000 = 40,500

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 3,
      requestedRooms: 2,
      travelers: [
        { type: 'adult', firstName: 'A', lastName: 'M' },
        { type: 'adult', firstName: 'B', lastName: 'M' },
        { type: 'adult', firstName: 'C', lastName: 'M' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_multi_room_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.roomCount).toBe(2)
  })

  it('Scenario 6: Child Sharing Bed (50% Rate per DB ChildPolicy)', async () => {
    const childCost = Math.round((BASE_PRICE_EGP * CHILD_SHARING_PCT) / 100) // 6,250
    const expectedTotal = 2 * BASE_PRICE_EGP + childCost // 25,000 + 6,250 = 31,250

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      childrenCount: 1,
      childAges: [6],
      childBeddingModes: ['sharing_bed'],
      travelers: [
        { type: 'adult', firstName: 'Parent', lastName: 'One' },
        { type: 'adult', firstName: 'Parent', lastName: 'Two' },
        { type: 'child', firstName: 'Kid', lastName: 'One' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_child_sharing_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.childrenTotalEGP).toBe(childCost)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.children[0].appliedPercentage,
    ).toBe(CHILD_SHARING_PCT)
  })

  it('Scenario 7: Child Extra Bed (75% Rate per DB ChildPolicy)', async () => {
    const childCost = Math.round((BASE_PRICE_EGP * CHILD_EXTRA_BED_PCT) / 100) // 9,375
    const expectedTotal = 2 * BASE_PRICE_EGP + childCost // 25,000 + 9,375 = 34,375

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      childrenCount: 1,
      childAges: [8],
      childBeddingModes: ['extra_bed'],
      travelers: [
        { type: 'adult', firstName: 'Parent', lastName: 'One' },
        { type: 'adult', firstName: 'Parent', lastName: 'Two' },
        { type: 'child', firstName: 'Kid', lastName: 'Extra' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_child_extra_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.childrenTotalEGP).toBe(childCost)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.children[0].appliedPercentage,
    ).toBe(CHILD_EXTRA_BED_PCT)
  })

  it('Scenario 8: Infant Under 2 Years (Zero Extra Cost)', async () => {
    const expectedTotal = 2 * BASE_PRICE_EGP // Infant is 0 EGP

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      childrenCount: 1,
      childAges: [1],
      childBeddingModes: ['sharing_bed'],
      travelers: [
        { type: 'adult', firstName: 'Parent', lastName: 'One' },
        { type: 'adult', firstName: 'Parent', lastName: 'Two' },
        { type: 'infant', firstName: 'Baby', lastName: 'One' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_infant_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.childrenTotalEGP).toBe(0)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.children[0].category).toBe(
      'infant',
    )
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. LOYALTY SSOT & ANTI-TAMPERING VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  it('Scenario 9: Loyalty Intent Validation — Applies Server Recomputed Valuation', async () => {
    // Customer has 5,000 points balance. Intends to redeem 500 points.
    // 500 points = (500 / 100) * 20 = 100 EGP discount
    const expectedDiscount = (500 / LOYALTY_REDEMPTION_UNIT) * LOYALTY_REDEMPTION_VALUE_EGP
    const expectedTotal = 2 * BASE_PRICE_EGP - expectedDiscount // 25,000 - 100 = 24,900

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      pointsToRedeem: 500,
      travelers: [
        { type: 'adult', firstName: 'John', lastName: 'Doe' },
        { type: 'adult', firstName: 'Jane', lastName: 'Doe' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_loyalty_valid',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft.pricingSnapshot.loyaltyDiscountEGP).toBe(expectedDiscount)
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
  })

  it('Scenario 10: Loyalty Anti-Tampering — Client Claims Excessive Points (999,999) -> Server Rejects', async () => {
    // Customer only has 5,000 points. Client attempts to redeem 999,999 points.
    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      pointsToRedeem: 999999,
      travelers: [
        { type: 'adult', firstName: 'John', lastName: 'Doe' },
        { type: 'adult', firstName: 'Jane', lastName: 'Doe' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_loyalty_hack',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/PointsCalculator.*insufficient|exceeds/i)
    expect(capturedCreatedDraft).toBeNull() // Booking creation MUST be aborted
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INTEGRITY & DATA VALIDATION GUARDS (INTENT VS AUTHORITY)
  // ──────────────────────────────────────────────────────────────────────────

  it('Scenario 11: Manifest Count Inconsistency — Manifest Count !== Adults + Children -> Rejected', async () => {
    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      childrenCount: 1,
      childAges: [6],
      travelers: [
        // Only 2 travelers provided when 3 (2 adults + 1 child) were submitted
        { type: 'adult', firstName: 'A', lastName: 'One' },
        { type: 'adult', firstName: 'B', lastName: 'Two' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_manifest_mismatch',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Traveler manifest count \(2\) does not match submitted totals/i)
  })

  it('Scenario 12: Child Ages Count Inconsistency — Children !== childAges.length -> Rejected', async () => {
    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      childrenCount: 2,
      childAges: [5], // Provided only 1 age for 2 children
      travelers: [
        { type: 'adult', firstName: 'A', lastName: 'One' },
        { type: 'adult', firstName: 'B', lastName: 'Two' },
        { type: 'child', firstName: 'C', lastName: 'Child1' },
        { type: 'child', firstName: 'D', lastName: 'Child2' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_child_ages_mismatch',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Submitted 2 children but received 1 child ages/i)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SECURITY BOUNDARY
  // ──────────────────────────────────────────────────────────────────────────

  it('Scenario 13: Security Boundary — Staff/Admin Attempting Customer Checkout -> Rejected', async () => {
    vi.mocked(SessionResolver.resolve).mockResolvedValueOnce({
      isAuthenticated: true,
      role: 'admin',
      userId: 1,
      customerId: undefined,
      email: 'admin@laubevoyage.com',
    })

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      slotId: 768,
      adults: 2,
      travelers: [
        { type: 'adult', firstName: 'Staff', lastName: 'User' },
        { type: 'adult', firstName: 'Staff', lastName: 'Guest' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_admin_blocked',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(
      'Staff accounts cannot create customer reservations. Please sign in with a traveler account.',
    )
    expect(capturedCreatedDraft).toBeNull()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. BOOKING CREATOR FAIL-FAST ENFORCEMENT (CONDITION 4)
  // ──────────────────────────────────────────────────────────────────────────

  it('Scenario 14: BookingCreator rejects creation if authoritative pricingSnapshot is missing', async () => {
    const mockRepo: any = { create: vi.fn() }
    const mockCust: any = { findById: vi.fn().mockResolvedValue({ id: 768, status: 'active' }) }
    const mockExp: any = {
      getById: vi.fn().mockResolvedValue(mockExperience693),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
    }
    const mockLoy: any = {}

    // Instantiated without a pricingPipeline to simulate production container
    const creator = new BookingCreator(mockRepo, mockCust, mockExp, mockLoy, {} as any)

    await expect(
      creator.createDraft({
        userId: 768,
        departure: mockDepartureSlot768,
        endDate: '2026-10-18',
        source: 'website',
        travelers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+201000000000',
            type: 'adult',
          },
        ],
        // Intentionally missing pricingSnapshot!
      }),
    ).rejects.toThrow(/Missing authoritative pricingSnapshot.*BookingCreator has no fallback/)
  })

  it('Scenario 15: Multi-Stay Package — Aggregates Occupancy Supplements Across Multiple Stays', async () => {
    // Multi-stay experience with 2 stays: Cairo Hotel (3,000 EGP) + Luxor Cruise (2,000 EGP)
    const multiStayExperience: PackageExperienceAggregate = {
      ...mockExperience693,
      id: 694,
      accommodations: [
        {
          order: 1,
          propertyId: 10,
          nights: 2,
          roomCategory: 'Deluxe Nile View Suite',
          boardBasis: 'Bed & Breakfast',
          occupancyOptions: [
            { occupancy: 'single', supplementEGP: SINGLE_SUPPLEMENT_EGP }, // 3,000
            { occupancy: 'double', supplementEGP: 0 },
          ],
        },
        {
          order: 2,
          propertyId: 20,
          nights: 3,
          roomCategory: 'Royal Nile Cruise Cabin',
          boardBasis: 'Full Board',
          occupancyOptions: [
            { occupancy: 'single', supplementEGP: 2000 }, // 2,000
            { occupancy: 'double', supplementEGP: 0 },
          ],
        },
      ],
    } as any

    const { getApplicationServices } = await import('@/application/factory')
    const currentServices: any = await getApplicationServices()
    currentServices.experience.getById.mockImplementation((id: number) => {
      if (id === 694) return Promise.resolve(multiStayExperience)
      return Promise.resolve(mockExperience693)
    })
    currentServices.experience.resolveBookableDepartureBySlot.mockImplementation(
      (expId: number, slotId: number) => {
        return Promise.resolve({
          ...mockDepartureSlot768,
          experienceId: expId,
        })
      },
    )

    // Expected total: Base Price (12,500) + Stay 1 Single (3,000) + Stay 2 Single (2,000) = 17,500
    const expectedStaySupplements = SINGLE_SUPPLEMENT_EGP + 2000
    const expectedTotal = BASE_PRICE_EGP + expectedStaySupplements

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 694,
      slotId: 768,
      adults: 1,
      travelers: [
        { type: 'adult', firstName: 'Solo', lastName: 'Explorer', email: 'solo@example.com' },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_multi_stay_001',
    })

    expect(result.success).toBe(true)
    expect(capturedCreatedDraft).toBeDefined()
    expect(capturedCreatedDraft.pricingSnapshot.totalAmountEGP).toBe(expectedTotal)
    expect(
      capturedCreatedDraft.pricingSnapshot.commercialBreakdown.occupancySupplementsTotalEGP,
    ).toBe(expectedStaySupplements)
    expect(capturedCreatedDraft.pricingSnapshot.commercialBreakdown.staysBreakdown).toHaveLength(2)
  })
})

