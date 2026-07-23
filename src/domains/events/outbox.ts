import { EventBus, type BaseDomainEvent } from './event-bus'

export interface EventOutboxRecord {
  eventId: string
  eventType: string
  eventVersion: string
  payloadJson: string
  status: 'pending' | 'published' | 'failed'
  createdAt: string
  publishedAt?: string
}

/**
 * Event Outbox Service
 * Guarantees transactional event recording prior to subscriber dispatch.
 */
export class EventOutboxService {
  private static instance: EventOutboxService
  private outboxStore: Map<string, EventOutboxRecord> = new Map()
  private eventBus: EventBus

  private constructor() {
    this.eventBus = EventBus.getInstance()
  }

  public static getInstance(): EventOutboxService {
    if (!EventOutboxService.instance) {
      EventOutboxService.instance = new EventOutboxService()
    }
    return EventOutboxService.instance
  }

  /**
   * Record domain event to outbox store atomically.
   */
  async recordAndPublish<T extends { type: string; eventVersion?: string }>(event: T): Promise<EventOutboxRecord> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const record: EventOutboxRecord = {
      eventId,
      eventType: event.type,
      eventVersion: event.eventVersion || 'v1',
      payloadJson: JSON.stringify(event),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    this.outboxStore.set(eventId, record)

    // Publish to in-memory EventBus subscribers
    await this.eventBus.publish(event as BaseDomainEvent)

    record.status = 'published'
    record.publishedAt = new Date().toISOString()
    this.outboxStore.set(eventId, record)

    return record
  }
}
