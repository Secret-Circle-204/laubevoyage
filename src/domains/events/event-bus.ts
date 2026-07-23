export interface BaseDomainEvent {
  type: string
  [key: string]: any
}

type EventHandler<T extends BaseDomainEvent = BaseDomainEvent> = (event: T) => Promise<void> | void

/**
 * Domain Event Bus
 * Decoupled in-memory asynchronous event dispatcher.
 */
export class EventBus {
  private static instance: EventBus
  private handlers: Map<string, EventHandler[]> = new Map()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Subscribe a handler function to a specific domain event type.
   */
  subscribe<T extends BaseDomainEvent>(eventType: T['type'], handler: (event: T) => Promise<void> | void): void {
    const existing = this.handlers.get(eventType) || []
    this.handlers.set(eventType, [...existing, handler as EventHandler])
  }

  /**
   * Publish a domain event asynchronously to all subscribed listeners.
   */
  async publish<T extends BaseDomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || []
    
    // Execute listeners concurrently in the background without blocking caller
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        console.error(`[EventBus] Error handling event ${event.type}:`, error)
      }
    })

    await Promise.all(promises)
  }
}

