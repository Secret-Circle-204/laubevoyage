import type { Payload, PayloadRequest } from 'payload'
import type { BaseDomainEvent } from '../event-bus'
import type { IOutboxRepository, DomainOutboxRecord } from '../contracts/outbox-repository.interface'

export class PayloadOutboxRepository implements IOutboxRepository {
  constructor(private payload: Payload) {}

  async add(event: BaseDomainEvent, dbTransaction?: unknown): Promise<DomainOutboxRecord> {
    const req = dbTransaction as PayloadRequest | undefined

    const doc = await this.payload.create({
      collection: 'event-outbox',
      data: {
        eventId: event.eventId,
        correlationId: event.correlationId,
        causationId: event.causationId || null,
        eventType: event.type,
        eventVersion: event.eventVersion || 1,
        aggregateType: event.aggregateType || 'System',
        aggregateId: event.aggregateId || event.eventId,
        payload: event as Record<string, unknown>,
        status: 'pending',
        retryCount: 0,
        occurredAt: event.occurredAt || new Date().toISOString(),
      },
      req,
    })

    return this.mapDocToRecord(doc)
  }

  async findPending(limit: number = 20): Promise<DomainOutboxRecord[]> {
    const nowIso = new Date().toISOString()
    const result = await this.payload.find({
      collection: 'event-outbox',
      where: {
        or: [
          { status: { equals: 'pending' } },
          {
            and: [
              { status: { equals: 'failed' } },
              { nextRetryAt: { less_than_equal: nowIso } },
            ],
          },
        ],
      },
      limit,
      sort: 'createdAt',
    })

    return result.docs.map((doc) => this.mapDocToRecord(doc))
  }

  async markAsPublished(eventId: string): Promise<void> {
    const found = await this.payload.find({
      collection: 'event-outbox',
      where: { eventId: { equals: eventId } },
      limit: 1,
    })

    if (found.docs[0]) {
      await this.payload.update({
        collection: 'event-outbox',
        id: found.docs[0].id,
        data: {
          status: 'published',
          publishedAt: new Date().toISOString(),
        },
      })
    }
  }

  async markAsFailed(
    eventId: string,
    errorMessage: string,
    nextRetryAt: string,
    newRetryCount: number,
  ): Promise<void> {
    const found = await this.payload.find({
      collection: 'event-outbox',
      where: { eventId: { equals: eventId } },
      limit: 1,
    })

    if (found.docs[0]) {
      await this.payload.update({
        collection: 'event-outbox',
        id: found.docs[0].id,
        data: {
          status: 'failed',
          errorMessage,
          nextRetryAt,
          retryCount: newRetryCount,
        },
      })
    }
  }

  async markAsDeadLetter(eventId: string, errorMessage: string): Promise<void> {
    const found = await this.payload.find({
      collection: 'event-outbox',
      where: { eventId: { equals: eventId } },
      limit: 1,
    })

    if (found.docs[0]) {
      await this.payload.update({
        collection: 'event-outbox',
        id: found.docs[0].id,
        data: {
          status: 'dead_letter',
          errorMessage,
        },
      })

      await this.payload.create({
        collection: 'admin-audit-logs',
        data: {
          auditId: `audit_dlq_${Date.now()}`,
          adminUser: 1,
          adminEmail: 'system@laubevoyage.com',
          action: 'POISON_EVENT_DEAD_LETTER',
          targetDomain: 'maintenance',
          targetId: eventId,
          reason: `Event ${eventId} failed all retries and moved to dead_letter: ${errorMessage}`,
          metadata: { eventId, errorMessage },
          executedAt: new Date().toISOString(),
        },
      }).catch((e) => console.error('[PayloadOutboxRepository] Failed to write DLQ audit log:', e))
    }
  }

  private mapDocToRecord(doc: Record<string, any>): DomainOutboxRecord {
    return {
      eventId: doc.eventId,
      correlationId: doc.correlationId,
      causationId: doc.causationId,
      eventType: doc.eventType,
      eventVersion: doc.eventVersion,
      aggregateType: doc.aggregateType,
      aggregateId: doc.aggregateId,
      payload: doc.payload || {},
      status: doc.status,
      retryCount: doc.retryCount,
      nextRetryAt: doc.nextRetryAt,
      errorMessage: doc.errorMessage,
      publishedAt: doc.publishedAt,
      occurredAt: doc.occurredAt,
      createdAt: doc.createdAt,
    }
  }
}
