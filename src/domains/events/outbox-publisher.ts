import type { IOutboxRepository } from './contracts/outbox-repository.interface'
import { EventBus, type BaseDomainEvent } from './event-bus'
import { classifyDispatchError } from './error-classifier'

export class OutboxPublisherWorker {
  private static BACKOFF_SCHEDULE_MS = [
    60 * 1000,          // 1 min
    5 * 60 * 1000,      // 5 min
    15 * 60 * 1000,     // 15 min
    60 * 60 * 1000,     // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
  ]

  private static MAX_RETRIES = 10
  private isRunning = false

  constructor(
    private outboxRepository: IOutboxRepository,
    private eventBus: EventBus = EventBus.getInstance(),
  ) {}

  /**
   * Polls and publishes pending or retryable outbox events.
   */
  async publishPendingEvents(): Promise<{ processedCount: number; failedCount: number }> {
    if (this.isRunning) {
      return { processedCount: 0, failedCount: 0 }
    }
    this.isRunning = true

    try {
      const workerId = `worker_${process.pid || 'main'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const pendingRecords = await this.outboxRepository.claimPending(20, workerId)
      let processedCount = 0
      let failedCount = 0

      if (pendingRecords.length > 0) {
        // Operational Metric: Oldest Pending Event Age
        const oldestRecord = pendingRecords[0]
        if (oldestRecord.createdAt) {
          const ageSeconds = Math.round((Date.now() - new Date(oldestRecord.createdAt).getTime()) / 1000)
          console.log(`[OutboxPublisherWorker] 📊 Queue Health Metric: Oldest pending event age is ${ageSeconds}s (EventID: ${oldestRecord.eventId}).`);
        }
        console.log(`[OutboxPublisherWorker] 📦 Found ${pendingRecords.length} pending events to publish in outbox.`);
      }

      for (const record of pendingRecords) {
        try {
          const domainEvent = record.payload as unknown as BaseDomainEvent
          console.log(`[OutboxPublisherWorker] ➡️ Processing outbox event ${record.eventId} (Type: ${domainEvent.type})`);

          // Dispatch to EventBus subscribers (wrapped with per-subscriber timeout and error propagation)
          await this.eventBus.publish(domainEvent)

          // Mark as published in DB outbox
          await this.outboxRepository.markAsPublished(record.eventId)
          console.log(`[OutboxPublisherWorker] ✅ Event ${record.eventId} successfully marked as published.`);
          processedCount++
        } catch (error: unknown) {
          failedCount++
          const { reasonCode, isRetryable, errorMessage } = classifyDispatchError(error)
          const newRetryCount = record.retryCount + 1

          if (!isRetryable) {
            console.error(
              `[OutboxPublisherWorker] 🚨 Poison Event ${record.eventId} encountered non-retryable error (ReasonCode: ${reasonCode}). Moving to dead_letter immediately. Error: ${errorMessage}`,
            )
            await this.outboxRepository.markAsDeadLetter(record.eventId, `[${reasonCode}] ${errorMessage}`)
          } else if (newRetryCount >= OutboxPublisherWorker.MAX_RETRIES) {
            console.error(
              `[OutboxPublisherWorker] 🚨 Event ${record.eventId} reached MAX_RETRIES (${OutboxPublisherWorker.MAX_RETRIES}). Moving to dead_letter (ReasonCode: ${reasonCode}). Error: ${errorMessage}`,
            )
            await this.outboxRepository.markAsDeadLetter(record.eventId, `[${reasonCode}] ${errorMessage}`)
          } else {
            const delayMs =
              OutboxPublisherWorker.BACKOFF_SCHEDULE_MS[
                Math.min(newRetryCount - 1, OutboxPublisherWorker.BACKOFF_SCHEDULE_MS.length - 1)
              ]
            const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

            console.warn(
              `[OutboxPublisherWorker] ⚠️ Event ${record.eventId} failed (attempt ${newRetryCount}, Reason: ${reasonCode}). Error: ${errorMessage}. Next retry at ${nextRetryAt}`,
            )
            await this.outboxRepository.markAsFailed(
              record.eventId,
              `[${reasonCode}] ${errorMessage}`,
              nextRetryAt,
              newRetryCount,
            )
          }
        }
      }

      return { processedCount, failedCount }
    } finally {
      this.isRunning = false
    }
  }
}
