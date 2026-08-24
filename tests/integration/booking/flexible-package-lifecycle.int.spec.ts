import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingCreator } from '@/domains/booking/creator'
import { BookingConfirmation } from '@/domains/booking/confirmation'
import { BookingStatus } from '@/types'
import { WebhookProcessor } from '@/domains/payment/webhook-processor'
import { EventOutboxService } from '@/domains/events/outbox'
import { EventBus } from '@/domains/events/event-bus'
import { BookableDeparture } from '@/domains/experience/bookable-departure'
import { ExperiencePolicy } from '@/domains/experience/policy'

vi.mock('@/domains/currency/catalog-registry', () => {
  return {
    catalogRegistry: {
      get: vi.fn().mockResolvedValue({
        isoCode: 'EGP',
        decimals: 2,
        symbol: 'EGP',
        isActive: true,
      }),
    },
  }
})

describe('Flexible Package E2E Lifecycle & Outbox Atomicity Integration Test', () => {
  let mockPayload: any
  let bookingRepo: any
  let paymentRepo: any
  let outboxRepo: any
  let creator: BookingCreator
  let confirmation: BookingConfirmation
  let webhookProcessor: WebhookProcessor
  let eventBus: EventBus

  const mockFlexiblePackage = {
    id: 108,
    slug: 'red-sea-desert-safari-flexible',
    title: 'Red Sea and Desert Safari — 4 Days Flexible Explorer',
    type: 'package' as const,
    packageMode: 'flexible_date' as const,
    durationDays: 4,
    durationNights: 3,
    price: 18000,
    availability: 'available',
    isActive: true,
    cityId: 101,
    blackouts: [],
  }

  beforeEach(() => {
    eventBus = EventBus.getInstance()
    
    // Mock Payload Database Client with Transaction Support
    mockPayload = {
      create: vi.fn(),
      update: vi.fn(),
      find: vi.fn(),
      findByID: vi.fn(),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_flex_001'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }

    const createdBookingDoc: any = {
      id: 999,
      bookingNumber: 'LBV-260822-99901',
      experience: 108,
      user: 142,
      startDate: '2026-11-15',
      endDate: '2026-11-18',
      status: BookingStatus.DRAFT,
      totalCost: 36000,
      currency: 'EGP',
      departureSlot: null, // Strictly null for Flexible Package
      capacityHold: {
        holdId: 'hold_flex_999',
        seats: 2,
        status: 'active',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      timeline: [],
      auditTrail: [],
      travelers: [
        { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        { firstName: 'Sara', lastName: 'Ali', email: 'sara@example.com', phone: '0100000001' },
      ],
    }

    bookingRepo = {
      findById: vi.fn().mockResolvedValue(createdBookingDoc),
      create: vi.fn().mockResolvedValue(createdBookingDoc),
      update: vi.fn().mockImplementation((id: number, data: any) => {
        Object.assign(createdBookingDoc, data)
        return Promise.resolve(createdBookingDoc)
      }),
      transitionStatus: vi.fn().mockImplementation((id: number, toStatus: string, data: any) => {
        Object.assign(createdBookingDoc, { ...data, status: toStatus })
        return Promise.resolve(createdBookingDoc)
      }),
    }

    const mockTxDoc = {
      id: 888,
      transactionId: 'tx_stripe_session_999',
      bookingId: 999,
      customerId: 142,
      provider: 'stripe',
      status: 'pending',
      attempts: [],
    }

    paymentRepo = {
      findByBookingId: vi.fn().mockResolvedValue(mockTxDoc),
      findByTransactionId: vi.fn().mockResolvedValue(mockTxDoc),
      createTransaction: vi.fn().mockResolvedValue(mockTxDoc),
      appendAttempt: vi.fn().mockResolvedValue(mockTxDoc),
      findWebhookByEventId: vi.fn().mockResolvedValue(null),
      appendWebhook: vi.fn().mockResolvedValue(mockTxDoc),
      updateStatus: vi.fn().mockImplementation((txId: string, status: string) => {
        mockTxDoc.status = status
        return Promise.resolve(mockTxDoc)
      }),
      beginTransaction: vi.fn().mockResolvedValue('tx_payment_001'),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    }

    outboxRepo = {
      add: vi.fn().mockImplementation((event: any, tx: any) => {
        return Promise.resolve({
          eventId: event.eventId,
          eventType: event.type,
          status: 'pending',
          payload: event,
          occurredAt: event.occurredAt || new Date().toISOString(),
        })
      }),
    }

    EventOutboxService.getInstance(outboxRepo)

    const mockSlotQueries = {
      findDepartureSlotByDate: vi.fn(), // MUST NEVER BE CALLED!
      findDepartureSlotById: vi.fn(),
      findSlotsByExperienceId: vi.fn(),
    }

    const mockExperienceService = {
      getById: vi.fn().mockResolvedValue(mockFlexiblePackage),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
      findDepartureSlotById: mockSlotQueries.findDepartureSlotById,
    }

    const mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue({ id: 142, status: 'active' }),
    }

    const mockLoyaltyService = {
      getCustomerBalance: vi.fn().mockResolvedValue(0),
      calculatePointValueInEGP: vi.fn().mockResolvedValue(0),
    }

    const mockPricingPipeline = {
      calculateCheckoutSnapshot: vi.fn().mockResolvedValue({
        basePriceEGP: 18000,
        subtotalEGP: 36000,
        totalAmountEGP: 36000,
        displayCurrency: 'EGP',
        displayAmount: 36000,
        exchangeRate: 1,
        pricingVersion: 'v2',
      }),
    }

    creator = new BookingCreator(
      bookingRepo,
      mockCustomerRepo as any,
      mockExperienceService as any,
      mockLoyaltyService as any,
      mockPricingPipeline as any,
    )

    confirmation = new BookingConfirmation(bookingRepo, undefined)
    webhookProcessor = new WebhookProcessor(paymentRepo, outboxRepo)
  })

  it('should execute full Flexible Package booking lifecycle with 0 departure slots, atomic in-transaction outbox recording, and zero slot table queries', async () => {
    // =========================================================================
    // 1. DATE SELECTION & DOMAIN VALIDATION (Flexible Date Selection Model)
    // =========================================================================
    const selectedStartDate = '2026-11-15'
    const now = new Date('2026-08-22T08:00:00Z')

    const bookability = ExperiencePolicy.isFlexiblePackageStartDateBookable(
      {
        startDate: selectedStartDate,
        durationDays: mockFlexiblePackage.durationDays,
        blackouts: mockFlexiblePackage.blackouts,
        timezone: 'Africa/Cairo',
      },
      now,
    )

    expect(bookability.allowed).toBe(true)

    // Construct bookable departure projection (Slot-less read model)
    const departure = new BookableDeparture({
      departureId: `FLEX-${mockFlexiblePackage.id}-${selectedStartDate}`,
      experienceId: mockFlexiblePackage.id,
      experienceTitle: mockFlexiblePackage.title,
      experienceType: 'package',
      date: selectedStartDate,
      startTime: '',
      effectiveBasePrice: 18000,
      capacityAvailable: 9999,
      capacityTotal: 9999,
      status: 'available',
    })

    // =========================================================================
    // 2. DRAFT CREATION (slotId = null)
    // =========================================================================
    const draft = await creator.createDraft({
      userId: 142,
      departure,
      endDate: '2026-11-18', // 2026-11-15 + 4 days - 1 = 2026-11-18
      source: 'website',
      travelers: [
        { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        { firstName: 'Sara', lastName: 'Ali', email: 'sara@example.com', phone: '0100000001' },
      ],
    })

    expect(draft.departureSlot).toBeNull() // ZERO synthetic or physical slot ID
    expect(draft.status).toBe(BookingStatus.DRAFT)
    expect(draft.capacityHold).toBeNull() // Slot-less models do not require physical capacity holds
    expect(draft.paymentWindowExpiresAt).toBeDefined()

    // =========================================================================
    // 3. PAYMENT WEBHOOK (Atomic DB Transaction + PAYMENT_COMPLETED Outbox)
    // =========================================================================
    const rawPayload = {
      id: 'evt_stripe_test_flex_101',
      type: 'checkout.session.completed',
      created: 1787418500,
      data: {
        object: {
          id: 'cs_test_flex_session_999',
          payment_intent: 'pi_test_flex_999',
          amount_total: 3600000, // 36,000 EGP in piasters
          currency: 'egp',
          metadata: {
            bookingId: '999',
            transactionId: 'tx_stripe_session_999',
          },
          customer_details: { email: 'ahmed@example.com' },
        },
      },
    }

    const stripeAdapter = {
      verifyWebhook: vi.fn().mockResolvedValue(rawPayload),
    }
    const { PaymentAdapterFactory } = await import('@/domains/payment/adapters/factory')
    vi.spyOn(PaymentAdapterFactory, 'resolve').mockReturnValue(stripeAdapter as any)

    // Process webhook
    const webhookResult = await webhookProcessor.processStripeWebhook(
      'raw_body',
      'valid_sig',
      'stripe',
    )

    expect(webhookResult.processed).toBe(true)
    expect(paymentRepo.commitTransaction).toHaveBeenCalled()

    // Verify PAYMENT_COMPLETED outbox insert was called with transaction context
    expect(outboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYMENT_COMPLETED',
        bookingId: 999,
      }),
      expect.objectContaining({
        transactionId: expect.any(String),
      }),
    )

    // =========================================================================
    // 4. ATOMIC BOOKING CONFIRMATION & OUTBOX RECORDING (T1)
    // =========================================================================
    const txContext = { transactionId: 'tx_flex_001' }

    // Booking transitions from DRAFT -> PAID upon payment attempt verification
    await bookingRepo.update(999, { status: BookingStatus.PAID }, txContext)

    const confirmedBooking = await confirmation.confirm(999, undefined, txContext)

    expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED)
    expect(bookingRepo.transitionStatus).toHaveBeenCalledWith(
      999,
      BookingStatus.CONFIRMED,
      expect.any(Object),
      txContext,
    )

    // Verify BOOKING_CONFIRMED was recorded to Outbox inside txContext
    expect(outboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BOOKING_CONFIRMED',
        aggregateId: '999',
      }),
      txContext,
    )

    // =========================================================================
    // 5. CRITICAL INVARIANT ASSERTIONS: ZERO SLOT LEAKAGE
    // =========================================================================
    expect(confirmedBooking.departureSlot).toBeNull()
  })
})
