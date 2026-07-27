import type { Payload, PayloadRequest } from 'payload'
import type { IInboxRepository } from '../contracts/inbox-repository.interface'

export class PayloadInboxRepository implements IInboxRepository {
  constructor(private payload: Payload) {}

  async tryAcquire(
    eventId: string,
    subscriberName: string,
    dbTransaction?: unknown,
  ): Promise<boolean> {
    const req = dbTransaction as PayloadRequest | undefined
    const idempotencyKey = `${eventId}:${subscriberName}`

    try {
      await this.payload.create({
        collection: 'event-inbox',
        data: {
          idempotencyKey,
          processedEventId: eventId,
          subscriberName,
          processedAt: new Date().toISOString(),
        },
        req,
      })

      return true
    } catch {
      // Unique constraint violation means this event was already acquired/processed by this subscriber
      return false
    }
  }
}
