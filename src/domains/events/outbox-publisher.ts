import type { IOutboxRepository } from './contracts/outbox-repository.interface'
import { EventBus, type BaseDomainEvent } from './event-bus'

export class OutboxPublisherWorker {
  private static BACKOFF_SCHEDULE_MS = [
    60 * 1000,          // 1 min
    5 * 60 * 1000,      // 5 min
    15 * 60 * 1000,     // 15 min
    60 * 60 * 1000,     // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
  ]

  private static MAX_RETRIES = 10

  constructor(
    private outboxRepository: IOutboxRepository,
    private eventBus: EventBus = EventBus.getInstance(),
  ) {}

  /**
   * Polls and publishes pending or retryable outbox events.
   */
  async publishPendingEvents(): Promise<{ processedCount: number; failedCount: number }> {
    const pendingRecords = await this.outboxRepository.findPending(20)
    let processedCount = 0
    let failedCount = 0

    for (const record of pendingRecords) {
      try {
        const domainEvent = record.payload as unknown as BaseDomainEvent

        // Dispatch to EventBus subscribers
        await this.eventBus.publish(domainEvent)

        // Mark as published in DB outbox
        await this.outboxRepository.markAsPublished(record.eventId)
        processedCount++
      } catch (error: unknown) {
        failedCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown event dispatch error'
        const newRetryCount = record.retryCount + 1

        if (newRetryCount >= OutboxPublisherWorker.MAX_RETRIES) {
          console.error(`[OutboxPublisherWorker] Event ${record.eventId} reached MAX_RETRIES (${OutboxPublisherWorker.MAX_RETRIES}). Moving to dead_letter.`)
          await this.outboxRepository.markAsDeadLetter(record.eventId, errorMessage)
        } else {
          const delayMs = OutboxPublisherWorker.BACKOFF_SCHEDULE_MS[
            Math.min(newRetryCount - 1, OutboxPublisherWorker.BACKOFF_SCHEDULE_MS.length - 1)
          ]
          const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

          console.warn(`[OutboxPublisherWorker] Event ${record.eventId} failed (attempt ${newRetryCount}). Next retry at ${nextRetryAt}`)
          await this.outboxRepository.markAsFailed(record.eventId, errorMessage, nextRetryAt, newRetryCount)
        }
      }
    }

    return { processedCount, failedCount }
  }
}
