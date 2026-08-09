import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerNotificationSubscribers } from '@/domains/events/subscribers/notification-subscriber'
import { EventBus } from '@/domains/events/event-bus'

const mockInboxRepo = {
  tryAcquire: vi.fn(),
}
vi.mock('@/domains/events/repositories/payload-inbox-repository', () => {
  return {
    PayloadInboxRepository: class {
      tryAcquire(eventId: string, subscriberId: string, req?: any) {
        return mockInboxRepo.tryAcquire(eventId, subscriberId, req)
      }
    },
  }
})

const mockCustomerRepo = {
  findById: vi.fn(),
}
vi.mock('@/domains/customer/repository', () => {
  return {
    CustomerRepository: class {
      findById(id: number, req?: any) {
        return mockCustomerRepo.findById(id, req)
      }
    },
  }
})

const mockNotificationService = {
  enqueueNotification: vi.fn(),
}
vi.mock('@/domains/notification/service', () => {
  return {
    NotificationService: class {
      enqueueNotification(data: any, req?: any) {
        return mockNotificationService.enqueueNotification(data, req)
      }
    },
  }
})

describe('Events Domain: NotificationSubscriber Unit Tests', () => {
  let mockPayload: any
  const eventBus = EventBus.getInstance()

  beforeEach(() => {
    vi.restoreAllMocks()

    mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('mock_tx_999'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
    }

    mockInboxRepo.tryAcquire.mockResolvedValue(true)
    mockCustomerRepo.findById.mockResolvedValue({
      customerId: 32,
      email: 'db-resolved@laube.com',
      fullName: 'Hamza Test',
    })
    mockNotificationService.enqueueNotification.mockResolvedValue(undefined)

    // Clear previous subscribers to avoid running original database code in other tests
    const handlersMap = (eventBus as any).handlers
    if (handlersMap) {
      handlersMap.clear()
    }

    registerNotificationSubscribers(mockPayload)
  })

  it('should use event.customerEmail directly when it is provided in the PAYMENT_COMPLETED event', async () => {
    const event = {
      type: 'PAYMENT_COMPLETED' as const,
      eventId: 'evt_stripe_999',
      correlationId: 'corr_999',
      eventVersion: 1,
      occurredAt: '2026-08-09T00:00:00.000Z',
      aggregateType: 'Payment',
      aggregateId: 'tx_123',
      transactionId: 'tx_123',
      bookingId: 101,
      customerId: 32,
      customerEmail: 'event-given@laube.com',
      provider: 'stripe' as const,
      amount: 100,
      currency: 'USD',
      attemptId: 'att_1',
      attemptNumber: 1,
    }

    await eventBus.publish(event)

    expect(mockInboxRepo.tryAcquire).toHaveBeenCalledWith('evt_stripe_999', 'NotificationSubscriber.enqueuePaymentReceipt', expect.any(Object))
    expect(mockCustomerRepo.findById).not.toHaveBeenCalled()
    expect(mockNotificationService.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'event-given@laube.com',
        referenceId: 'tx_123',
      }),
      expect.any(Object),
    )
    expect(mockPayload.db.commitTransaction).toHaveBeenCalledWith('mock_tx_999')
  })

  it('should fallback to resolving customer email from CustomerRepository when customerEmail is missing in the event', async () => {
    const event = {
      type: 'PAYMENT_COMPLETED' as const,
      eventId: 'evt_stripe_888',
      correlationId: 'corr_888',
      eventVersion: 1,
      occurredAt: '2026-08-09T00:00:00.000Z',
      aggregateType: 'Payment',
      aggregateId: 'tx_123',
      transactionId: 'tx_123',
      bookingId: 101,
      customerId: 32,
      customerEmail: undefined, // Optional email
      provider: 'stripe' as const,
      amount: 100,
      currency: 'USD',
      attemptId: 'att_1',
      attemptNumber: 1,
    }

    await eventBus.publish(event)

    expect(mockInboxRepo.tryAcquire).toHaveBeenCalledWith('evt_stripe_888', 'NotificationSubscriber.enqueuePaymentReceipt', expect.any(Object))
    expect(mockCustomerRepo.findById).toHaveBeenCalledWith(32, expect.any(Object))
    expect(mockNotificationService.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'db-resolved@laube.com',
      }),
      expect.any(Object),
    )
    expect(mockPayload.db.commitTransaction).toHaveBeenCalledWith('mock_tx_999')
  })

  it('should throw error and rollback transaction when resolving email fails (customer missing email)', async () => {
    mockCustomerRepo.findById.mockResolvedValue({
      customerId: 32,
      email: undefined, // missing email
    })

    const event = {
      type: 'PAYMENT_COMPLETED' as const,
      eventId: 'evt_stripe_777',
      correlationId: 'corr_777',
      eventVersion: 1,
      occurredAt: '2026-08-09T00:00:00.000Z',
      aggregateType: 'Payment',
      aggregateId: 'tx_123',
      transactionId: 'tx_123',
      bookingId: 101,
      customerId: 32,
      customerEmail: undefined,
      provider: 'stripe' as const,
      amount: 100,
      currency: 'USD',
      attemptId: 'att_1',
      attemptNumber: 1,
    }

    await expect(eventBus.publish(event)).rejects.toThrow(
      '[NotificationSubscriber] Customer #32 missing email for payment receipt.',
    )

    expect(mockPayload.db.rollbackTransaction).toHaveBeenCalledWith('mock_tx_999')
    expect(mockPayload.db.commitTransaction).not.toHaveBeenCalled()
  })
})
