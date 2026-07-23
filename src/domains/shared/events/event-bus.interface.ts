/**
 * Master Event Bus Abstraction (Domain Driven Architecture)
 * Shields Domain logic from underlying event transport (InMemory, RabbitMQ, Kafka, Azure Service Bus)
 */
export interface IDomainEvent {
  readonly eventId: string
  readonly eventName: string
  readonly timestamp: string
  readonly correlationId: string
}

export type EventHandler<T extends IDomainEvent = any> = (event: T) => Promise<void>

export interface IEventBus {
  publish<T extends IDomainEvent>(event: T): Promise<void>
  subscribe<T extends IDomainEvent>(eventName: string, handler: EventHandler<T>): void
}
