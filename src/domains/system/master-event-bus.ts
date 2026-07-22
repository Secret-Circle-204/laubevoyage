type EventSubscriber<T = any> = (event: T) => Promise<void> | void

/**
 * Master Event Bus
 * Single reactive event broker registering domain subscribers across all 11 domains.
 */
export class MasterEventBus {
  private static subscribers: Map<string, EventSubscriber[]> = new Map()

  static subscribe<T = any>(eventType: string, subscriber: EventSubscriber<T>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }
    this.subscribers.get(eventType)!.push(subscriber)
  }

  static async publish<T = any>(eventType: string, event: T): Promise<void> {
    const handlers = this.subscribers.get(eventType) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  static clearSubscribers(): void {
    this.subscribers.clear()
  }
}
