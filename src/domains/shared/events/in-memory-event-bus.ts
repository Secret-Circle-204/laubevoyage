import type { IEventBus, IDomainEvent, EventHandler } from './event-bus.interface'

export class InMemoryEventBus implements IEventBus {
  private static instance: InMemoryEventBus
  private handlersMap: Map<string, EventHandler[]> = new Map()

  public static getInstance(): InMemoryEventBus {
    if (!InMemoryEventBus.instance) {
      InMemoryEventBus.instance = new InMemoryEventBus()
    }
    return InMemoryEventBus.instance
  }

  subscribe<T extends IDomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlersMap.get(eventName) || []
    this.handlersMap.set(eventName, [...existing, handler])
  }

  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    const handlers = this.handlersMap.get(event.eventName) || []
    await Promise.all(handlers.map((h) => h(event)))
  }
}
