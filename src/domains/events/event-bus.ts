export interface BaseDomainEvent {
  type: string
  eventId: string
  correlationId: string
  causationId?: string
  eventVersion: number
  occurredAt: string
  aggregateType?: string
  aggregateId?: string
  [key: string]: unknown
}

export type EventHandler<T extends BaseDomainEvent = BaseDomainEvent> = (
  event: T,
) => Promise<void> | void

declare global {
  var __laubeEventBus: EventBus | undefined
}

/**
 * Domain Event Bus
 * Decoupled in-memory asynchronous event dispatcher.
 * HMR-safe and idempotent utilizing globally stored singleton and explicit subscriber identities.
 */
export class EventBus {
  private handlers: Map<string, Map<string, EventHandler<BaseDomainEvent>>> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!globalThis.__laubeEventBus) {
      globalThis.__laubeEventBus = new EventBus()
    }
    return globalThis.__laubeEventBus
  }

  /**
   * Subscribe a handler to a specific event type with a unique subscriberId.
   * If the subscriberId already exists for this event type, the handler is overwritten
   * to ensure hot-reloaded code executes (idempotent HMR support).
   */
  subscribe<T extends BaseDomainEvent>(
    eventType: T['type'],
    subscriberId: string,
    handler: (event: T) => Promise<void> | void,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map())
    }
    // Cast via unknown to ensure safe assignment to base event handler type without as any
    const baseHandler = handler as unknown as EventHandler<BaseDomainEvent>
    this.handlers.get(eventType)!.set(subscriberId, baseHandler)
  }

  /**
   * Publish an event to all registered subscribers.
   */
  async publish<T extends BaseDomainEvent>(event: T): Promise<void> {
    const subscriberMap = this.handlers.get(event.type)
    if (!subscriberMap) return

    const promises = Array.from(subscriberMap.values()).map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        console.error(`[EventBus] Error handling event ${event.type}:`, error)
      }
    })

    await Promise.all(promises)
  }
}
