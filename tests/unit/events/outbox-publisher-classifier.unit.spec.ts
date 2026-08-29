import { describe, it, expect, vi } from 'vitest'
import { OutboxPublisherWorker } from '@/domains/events/outbox-publisher'
import { classifyDispatchError } from '@/domains/events/error-classifier'
import { SubscriberTimeoutError, EventBus, type BaseDomainEvent } from '@/domains/events/event-bus'
import {
  CustomerNotFoundException,
  BookingNotFoundException,
  FinancialInvariantException,
  AuthenticationFailedException,
  DomainException,
} from '@/domains/shared/exceptions/domain-exception'
import type { IOutboxRepository, DomainOutboxRecord } from '@/domains/events/contracts/outbox-repository.interface'

describe('Unit: OutboxPublisherWorker & Error Classifier Resilience', () => {
  describe('classifyDispatchError()', () => {
    it('classifies SubscriberTimeoutError as retryable SUBSCRIBER_TIMEOUT', () => {
      const err = new SubscriberTimeoutError('TestSub', 'evt_1', 'TEST_EVENT', 15000)
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('SUBSCRIBER_TIMEOUT')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies Postgres 40P01 deadlock as retryable DATABASE_DEADLOCK', () => {
      const err = Object.assign(new Error('deadlock detected'), { code: '40P01' })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('DATABASE_DEADLOCK')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies Postgres 40001 serialization failure as retryable DATABASE_SERIALIZATION_FAILURE', () => {
      const err = Object.assign(new Error('could not serialize access due to read/write dependencies'), { code: '40001' })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('DATABASE_SERIALIZATION_FAILURE')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies Postgres 57P01 shutdown as retryable DATABASE_TRANSIENT_ERROR', () => {
      const err = Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('DATABASE_TRANSIENT_ERROR')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies ECONNREFUSED as retryable NETWORK_TIMEOUT', () => {
      const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('NETWORK_TIMEOUT')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies HTTP / Payload 404 NotFound as non-retryable ENTITY_NOT_FOUND', () => {
      const err = Object.assign(new Error('Not Found'), { status: 404, name: 'NotFound' })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('ENTITY_NOT_FOUND')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies CustomerNotFoundException (404) as non-retryable ENTITY_NOT_FOUND', () => {
      const err = new CustomerNotFoundException(441)
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('ENTITY_NOT_FOUND')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies BookingNotFoundException (404) as non-retryable ENTITY_NOT_FOUND', () => {
      const err = new BookingNotFoundException(2028)
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('ENTITY_NOT_FOUND')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies DomainException with VALIDATION_ERROR (400) as non-retryable VALIDATION_FAILED', () => {
      const err = new DomainException('Invalid dates', 'VALIDATION_ERROR', 400)
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('VALIDATION_FAILED')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies FinancialInvariantException (400) as non-retryable FINANCIAL_INVARIANT_VIOLATION', () => {
      const err = new FinancialInvariantException('Negative balance invariant violated')
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('FINANCIAL_INVARIANT_VIOLATION')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies AuthenticationFailedException (401) as non-retryable AUTH_CONFIGURATION_ERROR', () => {
      const err = new AuthenticationFailedException('Invalid API Key')
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('AUTH_CONFIGURATION_ERROR')
      expect(res.isRetryable).toBe(false)
    })

    it('classifies HTTP 429 as retryable RATE_LIMITED', () => {
      const err = Object.assign(new Error('Too Many Requests'), { status: 429 })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('RATE_LIMITED')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies HTTP 503 as retryable DOWNSTREAM_SERVER_ERROR', () => {
      const err = Object.assign(new Error('Service Unavailable'), { status: 503 })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('DOWNSTREAM_SERVER_ERROR')
      expect(res.isRetryable).toBe(true)
    })

    it('classifies nested cause errors accurately', () => {
      const cause = new CustomerNotFoundException(441)
      const err = new Error('Wrapper dispatch failed', { cause })
      const res = classifyDispatchError(err)
      expect(res.reasonCode).toBe('ENTITY_NOT_FOUND')
      expect(res.isRetryable).toBe(false)
    })
  })

  describe('OutboxPublisherWorker Execution & Terminal Dead Letter Semantics', () => {
    it('moves non-retryable 404 ENTITY_NOT_FOUND directly to dead_letter on first attempt', async () => {
      const mockOutboxRepo: IOutboxRepository = {
        add: vi.fn(),
        findPending: vi.fn(),
        claimPending: vi.fn().mockResolvedValue([
          {
            eventId: 'evt_earn_441_test',
            correlationId: 'corr_441',
            eventType: 'LOYALTY_EARNED',
            eventVersion: 1,
            aggregateType: 'Customer',
            aggregateId: '441',
            payload: { type: 'LOYALTY_EARNED', eventId: 'evt_earn_441_test', customerId: 441 },
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
          } as DomainOutboxRecord,
        ]),
        markAsPublished: vi.fn(),
        markAsFailed: vi.fn(),
        markAsDeadLetter: vi.fn().mockResolvedValue(undefined),
      }

      const mockEventBus = {
        publish: vi.fn().mockRejectedValue(new CustomerNotFoundException(441)),
      } as unknown as EventBus

      const worker = new OutboxPublisherWorker(mockOutboxRepo, mockEventBus)
      const result = await worker.publishPendingEvents()

      expect(result.failedCount).toBe(1)
      expect(result.processedCount).toBe(0)
      // Must NOT schedule retry for non-retryable error
      expect(mockOutboxRepo.markAsFailed).not.toHaveBeenCalled()
      // Must IMMEDIATELY mark as dead letter
      expect(mockOutboxRepo.markAsDeadLetter).toHaveBeenCalledWith(
        'evt_earn_441_test',
        expect.stringContaining('[ENTITY_NOT_FOUND]'),
      )
    })

    it('schedules retry with exponential backoff for transient deadlock error', async () => {
      const mockOutboxRepo: IOutboxRepository = {
        add: vi.fn(),
        findPending: vi.fn(),
        claimPending: vi.fn().mockResolvedValue([
          {
            eventId: 'evt_transient_1',
            correlationId: 'corr_1',
            eventType: 'BOOKING_CONFIRMED',
            eventVersion: 1,
            aggregateType: 'Booking',
            aggregateId: '100',
            payload: { type: 'BOOKING_CONFIRMED', eventId: 'evt_transient_1' },
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
          } as DomainOutboxRecord,
        ]),
        markAsPublished: vi.fn(),
        markAsFailed: vi.fn().mockResolvedValue(undefined),
        markAsDeadLetter: vi.fn(),
      }

      const deadlockErr = Object.assign(new Error('deadlock detected'), { code: '40P01' })
      const mockEventBus = {
        publish: vi.fn().mockRejectedValue(deadlockErr),
      } as unknown as EventBus

      const worker = new OutboxPublisherWorker(mockOutboxRepo, mockEventBus)
      const result = await worker.publishPendingEvents()

      expect(result.failedCount).toBe(1)
      expect(mockOutboxRepo.markAsDeadLetter).not.toHaveBeenCalled()
      expect(mockOutboxRepo.markAsFailed).toHaveBeenCalledWith(
        'evt_transient_1',
        expect.stringContaining('[DATABASE_DEADLOCK]'),
        expect.any(String),
        1,
      )
    })

    it('transitions retryable error to dead_letter when MAX_RETRIES (10) is reached', async () => {
      const mockOutboxRepo: IOutboxRepository = {
        add: vi.fn(),
        findPending: vi.fn(),
        claimPending: vi.fn().mockResolvedValue([
          {
            eventId: 'evt_max_retry_1',
            correlationId: 'corr_1',
            eventType: 'BOOKING_CONFIRMED',
            eventVersion: 1,
            aggregateType: 'Booking',
            aggregateId: '100',
            payload: { type: 'BOOKING_CONFIRMED', eventId: 'evt_max_retry_1' },
            status: 'failed',
            retryCount: 9, // Next retry will be attempt 10 (MAX_RETRIES)
            createdAt: new Date().toISOString(),
          } as DomainOutboxRecord,
        ]),
        markAsPublished: vi.fn(),
        markAsFailed: vi.fn(),
        markAsDeadLetter: vi.fn().mockResolvedValue(undefined),
      }

      const timeoutErr = new SubscriberTimeoutError('TestSub', 'evt_max_retry_1', 'BOOKING_CONFIRMED', 15000)
      const mockEventBus = {
        publish: vi.fn().mockRejectedValue(timeoutErr),
      } as unknown as EventBus

      const worker = new OutboxPublisherWorker(mockOutboxRepo, mockEventBus)
      const result = await worker.publishPendingEvents()

      expect(result.failedCount).toBe(1)
      expect(mockOutboxRepo.markAsFailed).not.toHaveBeenCalled()
      expect(mockOutboxRepo.markAsDeadLetter).toHaveBeenCalledWith(
        'evt_max_retry_1',
        expect.stringContaining('[SUBSCRIBER_TIMEOUT]'),
      )
    })

    it('marks event as published on successful subscriber execution', async () => {
      const mockOutboxRepo: IOutboxRepository = {
        add: vi.fn(),
        findPending: vi.fn(),
        claimPending: vi.fn().mockResolvedValue([
          {
            eventId: 'evt_success_1',
            correlationId: 'corr_1',
            eventType: 'LOYALTY_EARNED',
            eventVersion: 1,
            aggregateType: 'Customer',
            aggregateId: '500',
            payload: { type: 'LOYALTY_EARNED', eventId: 'evt_success_1', customerId: 500 },
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
          } as DomainOutboxRecord,
        ]),
        markAsPublished: vi.fn().mockResolvedValue(undefined),
        markAsFailed: vi.fn(),
        markAsDeadLetter: vi.fn(),
      }

      const mockEventBus = {
        publish: vi.fn().mockResolvedValue(undefined),
      } as unknown as EventBus

      const worker = new OutboxPublisherWorker(mockOutboxRepo, mockEventBus)
      const result = await worker.publishPendingEvents()

      expect(result.processedCount).toBe(1)
      expect(result.failedCount).toBe(0)
      expect(mockOutboxRepo.markAsPublished).toHaveBeenCalledWith('evt_success_1')
      expect(mockOutboxRepo.markAsDeadLetter).not.toHaveBeenCalled()
      expect(mockOutboxRepo.markAsFailed).not.toHaveBeenCalled()
    })
  })
})
