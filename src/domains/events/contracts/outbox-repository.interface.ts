import type { BaseDomainEvent } from '../event-bus'

export interface DomainOutboxRecord {
  eventId: string
  correlationId: string
  causationId?: string
  eventType: string
  eventVersion: number
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  status: 'pending' | 'published' | 'failed' | 'dead_letter'
  retryCount: number
  nextRetryAt?: string
  errorMessage?: string
  publishedAt?: string
  occurredAt: string
  createdAt?: string
}

export interface IOutboxRepository {
  add(event: BaseDomainEvent, dbTransaction?: unknown): Promise<DomainOutboxRecord>
  findPending(limit?: number): Promise<DomainOutboxRecord[]>
  claimPending(limit: number, workerId: string): Promise<DomainOutboxRecord[]>
  markAsPublished(eventId: string): Promise<void>
  markAsFailed(eventId: string, errorMessage: string, nextRetryAt: string, newRetryCount: number): Promise<void>
  markAsDeadLetter(eventId: string, errorMessage: string): Promise<void>
}
