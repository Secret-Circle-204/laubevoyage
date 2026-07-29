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

export class SubscriberTimeoutError extends Error {
  public readonly reasonCode = 'SUBSCRIBER_TIMEOUT' as const
  constructor(
    public readonly subscriberId: string,
    public readonly eventId: string,
    public readonly eventType: string,
    public readonly timeoutMs: number,
  ) {
    super(`[EventBus] Subscriber '${subscriberId}' timed out after ${timeoutMs}ms for event '${eventType}' (${eventId})`)
    this.name = 'SubscriberTimeoutError'
  }
}

/**
 * Domain Event Bus
 * Decoupled in-memory asynchronous event dispatcher.
 * HMR-safe and idempotent utilizing globally stored singleton and explicit subscriber identities.
 */
export class EventBus {
  private handlers: Map<string, Map<string, EventHandler<BaseDomainEvent>>> = new Map()
  private subscriberTimeoutsMs: Map<string, number> = new Map([
    ['NotificationSubscriber.enqueueBookingConfirmation', 10000],
    ['NotificationSubscriber.enqueuePaymentReceipt', 10000],
    ['DashboardSubscriber.updateProjectionOnBooking', 10000],
    ['LoyaltySubscriber.awardPointsOnBooking', 20000],
  ])

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
    timeoutMs?: number,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map())
    }
    if (timeoutMs) {
      this.subscriberTimeoutsMs.set(subscriberId, timeoutMs)
    }
    // Cast via unknown to ensure safe assignment to base event handler type without as any
    const baseHandler = handler as unknown as EventHandler<BaseDomainEvent>
    this.handlers.get(eventType)!.set(subscriberId, baseHandler)
  }

  /**
   * Publish an event to all registered subscribers.
   */
  async publish<T extends BaseDomainEvent>(event: T): Promise<void> {
    console.log(`[EventBus] 📢 Publishing event [${event.type}] (EventID: ${event.eventId || 'N/A'}, CorrelationID: ${event.correlationId || 'N/A'})`);
    const subscriberMap = this.handlers.get(event.type)
    if (!subscriberMap || subscriberMap.size === 0) {
      console.log(`[EventBus] ⚠️ No subscribers found for event [${event.type}]`);
      return
    }

    console.log(`[EventBus] Found ${subscriberMap.size} subscribers for [${event.type}]: ${Array.from(subscriberMap.keys()).join(', ')}`);

    const promises = Array.from(subscriberMap.entries()).map(async ([subscriberId, handler]) => {
      const timeoutMs = this.subscriberTimeoutsMs.get(subscriberId) || 15000
      const startTime = Date.now()

      try {
        console.log(`[EventBus] [${event.type}] -> Running subscriber [${subscriberId}] (Timeout: ${timeoutMs}ms)...`);
        
        let timerId: NodeJS.Timeout | undefined
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(new SubscriberTimeoutError(subscriberId, event.eventId || 'N/A', event.type, timeoutMs))
          }, timeoutMs)
        })

        try {
          await Promise.race([handler(event), timeoutPromise])
        } finally {
          if (timerId) clearTimeout(timerId)
        }

        console.log(`[EventBus] [${event.type}] -> Subscriber [${subscriberId}] completed successfully in ${Date.now() - startTime}ms.`);
      } catch (error) {
        console.error(`[EventBus] ❌ Error handling event [${event.type}] in subscriber [${subscriberId}]:`, error)
        throw error
      }
    })

    await Promise.all(promises)
    console.log(`[EventBus] 📢 Finished publishing event [${event.type}]`);
  }
}
