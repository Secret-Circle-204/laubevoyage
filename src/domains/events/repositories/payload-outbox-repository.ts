import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'
import type { BaseDomainEvent } from '../event-bus'
import type { IOutboxRepository, DomainOutboxRecord } from '../contracts/outbox-repository.interface'

export class PayloadOutboxRepository implements IOutboxRepository {
  constructor(private payload: Payload) {}

  async add(event: BaseDomainEvent, dbTransaction?: unknown): Promise<DomainOutboxRecord> {
    let req: PayloadRequest | undefined
    if (dbTransaction && typeof dbTransaction === 'object' && 'transactionId' in dbTransaction) {
      const context = dbTransaction as RequestContext
      req = context.transactionId
        ? ({
            transactionID: context.transactionId,
          } as unknown as PayloadRequest)
        : undefined
    } else {
      req = dbTransaction as PayloadRequest | undefined
    }

    console.log(`[PayloadOutboxRepository.add] Inserting outbox event [${event.type}] (ID: ${event.eventId}). Transactional Context:`, !!req?.transactionID)
    try {
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
      console.log(`[PayloadOutboxRepository.add] Outbox event [${event.type}] (ID: ${event.eventId}) saved successfully. Document ID: ${doc.id}`)
      return this.mapDocToRecord(doc)
    } catch (err) {
      console.error(`[PayloadOutboxRepository.add] Failed to save outbox event [${event.type}] (ID: ${event.eventId}). Error:`, err)
      throw err
    }
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

  async claimPending(limit: number = 20, workerId: string): Promise<DomainOutboxRecord[]> {
    const pool = (this.payload.db as any).pool
    if (!pool || typeof pool.query !== 'function') {
      // Fallback for mock environments/non-postgres setups
      return this.findPending(limit)
    }

    const nowIso = new Date().toISOString()
    const lockExpiresAt = new Date(Date.now() + 60000).toISOString() // 1 minute lock

    try {
      // Atomic query using SELECT FOR UPDATE SKIP LOCKED to ensure Process/Worker isolation
      const query = `
        UPDATE event_outbox
        SET status = 'processing',
            worker_id = $1,
            lock_expires_at = $2,
            updated_at = NOW()
        WHERE id IN (
          SELECT id FROM event_outbox
          WHERE (status = 'pending' OR (status = 'processing' AND lock_expires_at <= $3))
             OR (status = 'failed' AND (next_retry_at IS NULL OR next_retry_at <= $3))
          ORDER BY created_at ASC
          LIMIT $4
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `
      const res = await pool.query(query, [workerId, lockExpiresAt, nowIso, limit])
      return res.rows.map((row: any) => this.mapDocToRecord({
        ...row,
        eventId: row.event_id,
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        eventType: row.event_type,
        eventVersion: Number(row.event_version),
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        payload: row.payload,
        status: row.status,
        retryCount: Number(row.retry_count),
        nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at).toISOString() : undefined,
        errorMessage: row.error_message,
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
        occurredAt: row.occurred_at ? new Date(row.occurred_at).toISOString() : undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      }))
    } catch (error: unknown) {
      console.error('[PayloadOutboxRepository] claimPending transaction failed under DB load. Waiting for next tick:', error)
      return []
    }
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
          workerId: null,
          lockExpiresAt: null,
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
          workerId: null,
          lockExpiresAt: null,
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
          workerId: null,
          lockExpiresAt: null,
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
