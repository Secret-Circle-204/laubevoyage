import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerLoyaltySubscriber } from '@/domains/events/subscribers/loyalty-subscriber'
import { EventBus } from '@/domains/events/event-bus'
import type { BookingConfirmedEvent } from '@/domains/events/booking-events'
import { BookingStatus } from '@/types'
import type { BookingAggregate } from '@/domains/booking/types'
import { LoyaltyWorkflowEngine } from '@/domains/loyalty/workflow'
import { LoyaltyRepository } from '@/domains/loyalty/repository'

describe('BNPL Actual-Payment Loyalty SSOT & Stripe Isolation (Unit & Architectural Tests)', () => {
  let eventBus: EventBus
  let mockPayload: any
  let mockCustomerService: any
  let mockLoyaltyService: any

  const createMockBooking = (amountPaid: number, totalAmountEGP: number = 3480): BookingAggregate => ({
    id: 14427,
    bookingNumber: 'LBV-260829-81458',
    version: 1,
    source: 'website',
    status: BookingStatus.CONFIRMED,
    customerId: 642,
    experienceId: 101,
    travelers: [{ firstName: 'Nono', lastName: 'Mazen', email: 'nono@example.com', phone: '123' }],
    startDate: '2026-08-29',
    endDate: '2026-08-29',
    completionAt: '2026-08-29T12:00:00Z',
    paymentWindowExpiresAt: '2026-08-29T12:05:00Z',
    pricingSnapshot: {
      version: 1,
      pricingVersion: 1,
      basePriceEGP: totalAmountEGP,
      promotionDiscountEGP: 0,
      couponDiscountEGP: 0,
      loyaltyDiscountEGP: 0,
      subtotalEGP: totalAmountEGP,
      taxes: 0,
      fees: 0,
      totalAmountEGP,
      displayCurrency: 'EGP',
      displayAmount: totalAmountEGP,
      exchangeRate: 1,
    },
    capacityHold: null,
    pointHold: null,
    paymentStatus: amountPaid === totalAmountEGP ? 'paid' : (amountPaid > 0 ? 'partially_paid' : 'unpaid'),
    amountPaid,
    outstandingBalance: Math.max(0, totalAmountEGP - amountPaid),
    pointsEarned: 0,
    paymentAttempts: [],
    timeline: [],
    auditTrail: [],
    documents: {},
    createdAt: '2026-08-29T00:00:00Z',
    updatedAt: '2026-08-29T00:00:00Z',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    delete (globalThis as any).__laubeEventBus
    eventBus = EventBus.getInstance()

    mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx-1'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      create: vi.fn().mockResolvedValue({ id: 'inbox_1' }),
      update: vi.fn().mockResolvedValue({ id: 14427 }),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
    }

    mockCustomerService = {
      getProfile: vi.fn().mockResolvedValue({
        id: 642,
        email: 'nono@example.com',
        loyaltyTier: 'explorer',
        loyaltyPoints: 0,
      }),
      getCustomerById: vi.fn().mockResolvedValue({
        id: 642,
        email: 'nono@example.com',
        loyaltyTier: 'explorer',
        loyaltyPoints: 0,
      }),
      updateLoyaltyProfile: vi.fn().mockResolvedValue(undefined),
    }

    mockLoyaltyService = {
      calculateEarnedPoints: vi.fn().mockImplementation((amount: number) => amount),
      earnPointsForBooking: vi.fn().mockResolvedValue({
        id: 'ledger_123',
        points: 1480,
        resultingBalance: 1480,
      }),
      evaluateAndUpgradeTier: vi.fn().mockResolvedValue({
        upgraded: false,
        newTier: 'explorer',
      }),
    }
  })

  it('Scenario 1 (BNPL Initial Deposit): awards points and tier ONLY on deposit amount (1,480 EGP), not contractual total (3,480 EGP)', async () => {
    registerLoyaltySubscriber(mockPayload, mockCustomerService, mockLoyaltyService)

    const booking = createMockBooking(1480, 3480)
    const event: BookingConfirmedEvent = {
      eventId: 'evt_test_bnpl_initial_unique',
      correlationId: 'corr_bnpl_initial',
      type: 'BOOKING_CONFIRMED',
      aggregateType: 'Booking',
      aggregateId: '14427',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      booking,
      actor: { id: 'admin_1', type: 'admin', name: 'Admin Concierge' },
    }

    await eventBus.publish(event)

    // 1. Calculate points called ONLY on actual money paid: 1480
    expect(mockLoyaltyService.calculateEarnedPoints).toHaveBeenCalledTimes(1)
    expect(mockLoyaltyService.calculateEarnedPoints).toHaveBeenCalledWith(1480)

    // 2. PointLedger earn credited ONLY on 1480
    expect(mockLoyaltyService.earnPointsForBooking).toHaveBeenCalledTimes(1)
    expect(mockLoyaltyService.earnPointsForBooking).toHaveBeenCalledWith(
      642,
      14427,
      1480,
      'LBV-260829-81458',
      undefined,
      expect.any(Object),
    )

    // 3. Tier evaluation and totalSpent incremented ONLY by 1480
    expect(mockLoyaltyService.evaluateAndUpgradeTier).toHaveBeenCalledTimes(1)
    expect(mockLoyaltyService.evaluateAndUpgradeTier).toHaveBeenCalledWith(
      642,
      1480,
      undefined,
      expect.any(Object),
    )
  })

  it('Scenario 2 (BNPL Unpaid Confirmed): awards ZERO points and ZERO qualifying spend if amountPaid is 0', async () => {
    registerLoyaltySubscriber(mockPayload, mockCustomerService, mockLoyaltyService)

    const booking = createMockBooking(0, 3480)
    const event: BookingConfirmedEvent = {
      eventId: 'evt_test_bnpl_unpaid_unique',
      correlationId: 'corr_bnpl_unpaid',
      type: 'BOOKING_CONFIRMED',
      aggregateType: 'Booking',
      aggregateId: '14427',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      booking,
      actor: { id: 'admin_1', type: 'admin', name: 'Admin Concierge' },
    }

    await eventBus.publish(event)

    // Zero points calculated, zero earn credited, zero tier evaluation
    expect(mockLoyaltyService.calculateEarnedPoints).not.toHaveBeenCalled()
    expect(mockLoyaltyService.earnPointsForBooking).not.toHaveBeenCalled()
    expect(mockLoyaltyService.evaluateAndUpgradeTier).not.toHaveBeenCalled()
  })

  it('Scenario 3 (Stripe Full Payment Isolation): awards full 3,480 points and 3,480 EGP qualifying spend unchanged', async () => {
    registerLoyaltySubscriber(mockPayload, mockCustomerService, mockLoyaltyService)

    // For Stripe full payment, amountPaid === totalAmountEGP === 3480
    const booking = createMockBooking(3480, 3480)
    const event: BookingConfirmedEvent = {
      eventId: 'evt_test_stripe_full_unique',
      correlationId: 'corr_stripe_full',
      type: 'BOOKING_CONFIRMED',
      aggregateType: 'Booking',
      aggregateId: '14427',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      booking,
      actor: { id: 'system', type: 'system', name: 'Stripe Webhook' },
    }

    await eventBus.publish(event)

    // Full points calculated and credited on 3480
    expect(mockLoyaltyService.calculateEarnedPoints).toHaveBeenCalledWith(3480)
    expect(mockLoyaltyService.earnPointsForBooking).toHaveBeenCalledWith(
      642,
      14427,
      3480,
      'LBV-260829-81458',
      undefined,
      expect.any(Object),
    )
    expect(mockLoyaltyService.evaluateAndUpgradeTier).toHaveBeenCalledWith(
      642,
      3480,
      undefined,
      expect.any(Object),
    )
  })

  it('Scenario 4 (Idempotent Subsequent Tranche Earn): processes each subsequent tranche earn safely with tranche reference', async () => {
    const mockRepo = {
      getCustomerAggregate: vi.fn().mockResolvedValue({
        aggregate: { customerId: 642, tier: 'explorer', totalSpentEGP: 1480 },
      }),
      appendLedgerEntry: vi.fn().mockResolvedValue({
        id: 'ledger_tranche_2',
        points: 2000,
        resultingBalance: 3480,
      }),
      updateCustomerProjection: vi.fn().mockResolvedValue(undefined),
      findLedgerByReference: vi.fn().mockResolvedValue(null),
    }

    const workflowEngine = new LoyaltyWorkflowEngine(mockRepo as any)
    vi.spyOn(workflowEngine, 'getActiveConfig').mockResolvedValue({
      id: 'cfg_1',
      programCode: 'LAUBE_LOYALTY',
      name: 'Standard',
      version: 1,
      status: 'published',
      baseEarnRate: 1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 100,
      maxRedemptionPercent: 50,
      allowPartialRedemption: true,
      welcomeBonus: 0,
      expirationMonths: 12,
      bonusNeverExpires: false,
      tiers: [{ tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 }],
    })

    const record = await workflowEngine.earnPointsForBooking(
      642,
      14427,
      2000,
      'LBV-260829-81458',
      undefined,
      undefined,
      'manual_1787961959591_84q20',
    )

    expect(record.points).toBe(2000)
    expect(mockRepo.appendLedgerEntry).toHaveBeenCalledWith(
      642,
      'earn',
      2000,
      'Earned 2000 points for booking #LBV-260829-81458',
      'booking',
      '14427_manual_1787961959591_84q20',
      14427,
      expect.any(String),
      expect.objectContaining({
        amountSpentEGP: 2000,
      }),
      undefined,
    )
  })

  it('Scenario 5 (Cancellation & Refund based on Actual Ledger): reverses ONLY actual earned points (1480) when deposit only was paid', async () => {
    const mockRepo = {
      getCustomerAggregate: vi.fn().mockResolvedValue({
        aggregate: { customerId: 642, tier: 'explorer', totalSpentEGP: 1480 },
      }),
      getBookingLedgerEntries: vi.fn().mockResolvedValue([
        {
          id: 'ledger_1',
          type: 'earn',
          referenceType: 'booking',
          referenceId: '14427',
          points: 1480,
          metadata: { amountSpentEGP: 1480 },
        },
      ]),
      findLedgerByReference: vi.fn().mockResolvedValue(null),
      updateCustomerTier: vi.fn().mockResolvedValue(undefined),
      appendLedgerEntry: vi.fn().mockResolvedValue({ id: 'rev_1', points: -1480, resultingBalance: 0 }),
      getCurrentBalance: vi.fn().mockResolvedValue(1480),
      updateCustomerProjection: vi.fn().mockResolvedValue(undefined),
    }

    const workflowEngine = new LoyaltyWorkflowEngine(mockRepo as any)
    vi.spyOn(workflowEngine, 'getActiveConfig').mockResolvedValue({
      id: 'cfg_1',
      programCode: 'LAUBE_LOYALTY',
      name: 'Standard',
      version: 1,
      status: 'published',
      baseEarnRate: 1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 100,
      maxRedemptionPercent: 50,
      allowPartialRedemption: true,
      welcomeBonus: 0,
      expirationMonths: 12,
      bonusNeverExpires: false,
      tiers: [{ tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 }],
    })

    // Phase A: Spend Adjustment
    const resA = await workflowEngine.processBookingRedemptionRefund(642, 14427, 3480)
    expect(mockRepo.updateCustomerTier).toHaveBeenCalledWith(642, 'explorer', -1480, undefined)

    // Phase B: Earned Points Reversal
    const resB = await workflowEngine.refundPointsForCancellation(642, 14427, 1480)
    expect(resB.points).toBe(-1480)
    expect(mockRepo.appendLedgerEntry).toHaveBeenCalledWith(
      642,
      'reverse',
      -1480,
      'Reversal of earned points for cancelled booking #14427',
      'booking',
      '14427',
      14427,
      undefined,
      undefined,
      undefined,
    )
  })
})
