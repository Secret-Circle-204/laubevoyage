import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerBookingPaymentSubscriber } from '@/domains/events/subscribers/payment-subscriber'
import { EventBus } from '@/domains/events/event-bus'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus } from '@/types'

vi.mock('@/domains/factory', () => {
  const mockBookingService = {
    getById: vi.fn(),
    refund: vi.fn(),
  }
  const mockPaymentService = {
    getByTransactionId: vi.fn(),
  }
  return {
    getDomainServices: vi.fn().mockResolvedValue({
      booking: mockBookingService,
      payment: mockPaymentService,
    }),
  }
})

describe('Integration: Booking Payment Subscriber Refund Handling', () => {
  let mockPayload: any
  let eventBus: EventBus

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    eventBus = EventBus.getInstance()

    mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('transaction_1'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({}),
    }

    registerBookingPaymentSubscriber(mockPayload)
  })

  it('should transition booking to REFUNDED upon receiving PAYMENT_REFUNDED for a full refund', async () => {
    const { booking, payment } = await getDomainServices()

    // 1. Mock Booking state: CONFIRMED
    vi.mocked(booking.getById).mockResolvedValue({
      id: 999,
      status: BookingStatus.CONFIRMED,
      experienceId: 10,
      timeline: [],
      auditTrail: [],
    } as any)

    // 2. Mock Payment transaction state: status is 'refunded'
    vi.mocked(payment.getByTransactionId).mockResolvedValue({
      transactionId: 'tx_101',
      status: 'refunded',
      attempts: [
        { status: 'successful', amount: 5000 },
        { status: 'successful', amount: -5000 },
      ],
    } as any)

    // 3. Publish PAYMENT_REFUNDED
    await eventBus.publish({
      eventId: 'evt_pay_ref_999',
      correlationId: 'corr_999',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'PAYMENT_REFUNDED',
      transactionId: 'tx_101',
      bookingId: 999,
      amountRefunded: 5000,
      currency: 'EGP',
    })

    // 4. Assert that BookingService.refund was invoked with correct bookingId
    expect(booking.refund).toHaveBeenCalledWith(999, expect.any(Object), expect.any(Object))
    expect(mockPayload.db.commitTransaction).toHaveBeenCalledWith('transaction_1')
  })

  it('should NOT transition booking to REFUNDED for a partial refund', async () => {
    const { booking, payment } = await getDomainServices()

    // 1. Mock Booking state: CONFIRMED
    vi.mocked(booking.getById).mockResolvedValue({
      id: 999,
      status: BookingStatus.CONFIRMED,
      experienceId: 10,
    } as any)

    // 2. Mock Payment transaction state: status is 'partially_refunded' (amountRefunded = 1000, successful = 5000)
    vi.mocked(payment.getByTransactionId).mockResolvedValue({
      transactionId: 'tx_101',
      status: 'partially_refunded',
      attempts: [
        { status: 'successful', amount: 5000 },
        { status: 'successful', amount: -1000 },
      ],
    } as any)

    // 3. Publish PAYMENT_REFUNDED
    await eventBus.publish({
      eventId: 'evt_pay_ref_999_partial',
      correlationId: 'corr_999',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'PAYMENT_REFUNDED',
      transactionId: 'tx_101',
      bookingId: 999,
      amountRefunded: 1000,
      currency: 'EGP',
    })

    // 4. Assert that BookingService.refund was NOT called
    expect(booking.refund).not.toHaveBeenCalled()
    expect(mockPayload.db.commitTransaction).toHaveBeenCalledWith('transaction_1')
  })

  it('should not process PAYMENT_REFUNDED if the event has already been acquired (idempotency)', async () => {
    const { booking, payment } = await getDomainServices()

    // 1. Mock first delivery to succeed in creating the inbox record, but second delivery to fail (throw error)
    mockPayload.create
      .mockResolvedValueOnce({}) // first call (succeeds)
      .mockRejectedValueOnce(new Error('Duplicate key')) // second call (fails due to unique constraint)

    // 2. Mock Booking state: CONFIRMED
    vi.mocked(booking.getById).mockResolvedValue({
      id: 999,
      status: BookingStatus.CONFIRMED,
      experienceId: 10,
    } as any)

    // Mock Payment state: full refund
    vi.mocked(payment.getByTransactionId).mockResolvedValue({
      transactionId: 'tx_101',
      status: 'refunded',
      attempts: [
        { status: 'successful', amount: 5000 },
        { status: 'successful', amount: -5000 },
      ],
    } as any)

    const eventPayload = {
      eventId: 'evt_pay_ref_999_dup',
      correlationId: 'corr_999',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'PAYMENT_REFUNDED' as const,
      transactionId: 'tx_101',
      bookingId: 999,
      amountRefunded: 5000,
      currency: 'EGP',
    }

    // 3. Publish event first time (should be processed)
    await eventBus.publish(eventPayload)

    // 4. Publish event second time (should be ignored by idempotency guard)
    await eventBus.publish(eventPayload)

    // 5. Assert that BookingService.refund was only called once
    expect(booking.refund).toHaveBeenCalledTimes(1)
  })

  it('should throw an error and rollback transaction if trying to refund a COMPLETED booking', async () => {
    const { booking, payment } = await getDomainServices()

    // 1. Mock Booking state: COMPLETED
    vi.mocked(booking.getById).mockResolvedValue({
      id: 999,
      status: BookingStatus.COMPLETED,
      experienceId: 10,
    } as any)

    // 2. Mock Payment transaction state: status is 'refunded'
    vi.mocked(payment.getByTransactionId).mockResolvedValue({
      transactionId: 'tx_101',
      status: 'refunded',
      attempts: [
        { status: 'successful', amount: 5000 },
        { status: 'successful', amount: -5000 },
      ],
    } as any)

    // 3. Mock BookingService.refund to throw state transition error (simulating real BookingRefund validation)
    vi.mocked(booking.refund).mockRejectedValueOnce(new Error('[BookingStateMachine] Forbidden transition'))

    // 4. Publish PAYMENT_REFUNDED and expect the promise to reject (triggering subscriber transaction rollback)
    await expect(
      eventBus.publish({
        eventId: 'evt_pay_ref_999_completed',
        correlationId: 'corr_999',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        type: 'PAYMENT_REFUNDED',
        transactionId: 'tx_101',
        bookingId: 999,
        amountRefunded: 5000,
        currency: 'EGP',
      }),
    ).rejects.toThrowError('[BookingStateMachine] Forbidden transition')

    // 5. Assert rollback was executed and commit was not called
    expect(mockPayload.db.rollbackTransaction).toHaveBeenCalledWith('transaction_1')
    expect(mockPayload.db.commitTransaction).not.toHaveBeenCalled()
  })
})
