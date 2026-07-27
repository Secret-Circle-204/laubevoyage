import type { BaseDomainEvent } from './event-bus'
import type { IOutboxRepository, DomainOutboxRecord } from './contracts/outbox-repository.interface'

/**
 * Event Outbox Service
 * Guarantees transactional event recording via IOutboxRepository inside DB transactions.
 */
export class EventOutboxService {
  private static instance: EventOutboxService

  constructor(private outboxRepository: IOutboxRepository) {}

  public static getInstance(outboxRepository?: IOutboxRepository): EventOutboxService {
    if (!EventOutboxService.instance && outboxRepository) {
      EventOutboxService.instance = new EventOutboxService(outboxRepository)
    }
    return EventOutboxService.instance || new EventOutboxService(outboxRepository || ({} as any))
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
}
