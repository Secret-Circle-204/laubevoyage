import type { BaseDomainEvent } from './event-bus'
import type { IOutboxRepository, DomainOutboxRecord } from './contracts/outbox-repository.interface'
import { OutboxPublisherWorker } from './outbox-publisher'

/**
 * Event Outbox Service
 * Guarantees transactional event recording via IOutboxRepository inside DB transactions.
 */
export class EventOutboxService {
  private static instance: EventOutboxService

  constructor(private outboxRepository: IOutboxRepository) {}

  public static getInstance(outboxRepository?: IOutboxRepository): EventOutboxService {
    if (!EventOutboxService.instance) {
      EventOutboxService.instance = new EventOutboxService(outboxRepository || ({} as any))
    } else if (outboxRepository && (!EventOutboxService.instance.outboxRepository || !EventOutboxService.instance.outboxRepository.add)) {
      EventOutboxService.instance.outboxRepository = outboxRepository
    }
    return EventOutboxService.instance
  }

  /**
   * Encapsulated Worker Lifecycle Control (Single Ownership Rule)
   */
  public startWorker(): void {
    const symbol = Symbol.for('laube.outbox.worker.started')
    if ((global as any)[symbol]) return
    ;(global as any)[symbol] = true

    if (this.outboxRepository && 'findPending' in this.outboxRepository) {
      const worker = new OutboxPublisherWorker(this.outboxRepository)
      
      // Resilient Sequential Polling Loop (No Overlapping Ticks)
      ;(async () => {
        console.log('[EventOutboxService] 🔄 Resilient OutboxPublisherWorker loop started (Sequential 3s polling).')
        while (true) {
          try {
            await worker.publishPendingEvents()
          } catch (err) {
            console.error('[OutboxPublisherWorker] Polling loop error:', err)
          } finally {
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        }
      })()
    }
  }

  /**
   * Record domain event atomically into the database outbox within active dbTransaction context.
   */
  async record<T extends Partial<BaseDomainEvent> & { type: string }>(
    eventPayload: T,
    dbTransaction?: unknown,
  ): Promise<DomainOutboxRecord> {
    const eventId = eventPayload.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const correlationId = eventPayload.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const fullEvent: BaseDomainEvent = {
      ...eventPayload,
      eventId,
      correlationId,
      causationId: eventPayload.causationId,
      eventVersion: eventPayload.eventVersion || 1,
      occurredAt: eventPayload.occurredAt || new Date().toISOString(),
    }

    return this.outboxRepository.add(fullEvent, dbTransaction)
  }

  async recordAndPublish<T extends Partial<BaseDomainEvent> & { type: string }>(
    eventPayload: T,
    dbTransaction?: unknown,
  ): Promise<DomainOutboxRecord> {
    return this.record(eventPayload, dbTransaction)
  }
}
