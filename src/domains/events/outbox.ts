import type { BaseDomainEvent } from './event-bus'
import type { IOutboxRepository, DomainOutboxRecord } from './contracts/outbox-repository.interface'
import { OutboxPublisherWorker } from './outbox-publisher'

/**
 * Event Outbox Service
 * Guarantees transactional event recording via IOutboxRepository inside DB transactions.
 */
const OUTBOX_ABORT_KEY = Symbol.for('laube.outbox.worker.abort')
const OUTBOX_RUNNING_KEY = Symbol.for('laube.outbox.worker.running')

export class EventOutboxService {
  private static instance: EventOutboxService

  constructor(private outboxRepository: IOutboxRepository) {}

  public static getInstance(outboxRepository?: IOutboxRepository): EventOutboxService {
    if (!EventOutboxService.instance) {
      EventOutboxService.instance = new EventOutboxService(outboxRepository || ({} as any))
    } else if (outboxRepository && (!EventOutboxService.instance.outboxRepository || !EventOutboxService.instance.outboxRepository.add)) {
      EventOutboxService.instance.outboxRepository = outboxRepository
    }
    return EventOutboxService.instance
  }

  /**
   * Encapsulated Worker Lifecycle Control (Single Ownership Rule)
   */
  public startWorker(): void {
    const globalContext = globalThis as unknown as Record<symbol, any>
    
    // Cleanly abort any prior running loop
    if (typeof globalContext[OUTBOX_ABORT_KEY] === 'function') {
      globalContext[OUTBOX_ABORT_KEY]()
      globalContext[OUTBOX_ABORT_KEY] = null
    }

    globalContext[OUTBOX_RUNNING_KEY] = true

    if (this.outboxRepository && 'findPending' in this.outboxRepository) {
      const worker = new OutboxPublisherWorker(this.outboxRepository)
      
      // Resilient Sequential Polling Loop (No Overlapping Ticks & Interruptible Sleep)
      ;(async () => {
        if (process.env.ARCH_TRACE === 'true') {
          console.log('[EventOutboxService] 🔄 Resilient OutboxPublisherWorker loop started (Sequential 3s polling).')
        }
        while (globalContext[OUTBOX_RUNNING_KEY]) {
          try {
            await worker.publishPendingEvents()
          } catch (err) {
            console.error('[OutboxPublisherWorker] Polling loop error:', err)
          }

          if (!globalContext[OUTBOX_RUNNING_KEY]) break

          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(resolve, 3000)
              globalContext[OUTBOX_ABORT_KEY] = () => {
                clearTimeout(timeout)
                reject(new Error('ABORTED'))
              }
            })
          } catch {
            // Aborted immediately by stopWorker()
            break
          } finally {
            globalContext[OUTBOX_ABORT_KEY] = null
          }
        }
      })()
    }
  }

  public stopWorker(): void {
    const globalContext = globalThis as unknown as Record<symbol, any>
    globalContext[OUTBOX_RUNNING_KEY] = false

    if (typeof globalContext[OUTBOX_ABORT_KEY] === 'function') {
      globalContext[OUTBOX_ABORT_KEY]()
      globalContext[OUTBOX_ABORT_KEY] = null
    }

    if (process.env.ARCH_TRACE === 'true') {
      console.log('[EventOutboxService] OutboxPublisherWorker stopped successfully.')
    }
  }

  public isRunning(): boolean {
    const globalContext = globalThis as unknown as Record<symbol, any>
    return Boolean(globalContext[OUTBOX_RUNNING_KEY])
  }

  /**
   * Record domain event atomically into the database outbox within active dbTransaction context.
   */
  async record<T extends Partial<BaseDomainEvent> & { type: string }>(
    eventPayload: T,
    dbTransaction?: unknown,
  ): Promise<DomainOutboxRecord> {
    const eventId = eventPayload.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const correlationId = eventPayload.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const fullEvent: BaseDomainEvent = {
      ...eventPayload,
      eventId,
      correlationId,
      causationId: eventPayload.causationId,
      eventVersion: eventPayload.eventVersion || 1,
      occurredAt: eventPayload.occurredAt || new Date().toISOString(),
    }

    if (typeof this.outboxRepository?.add === 'function') {
      return this.outboxRepository.add(fullEvent, dbTransaction)
    }

    return {
      eventId: fullEvent.eventId,
      correlationId: fullEvent.correlationId,
      causationId: fullEvent.causationId,
      eventVersion: fullEvent.eventVersion,
      occurredAt: fullEvent.occurredAt,
      eventType: fullEvent.type,
      aggregateType: fullEvent.aggregateType || 'System',
      aggregateId: fullEvent.aggregateId || fullEvent.eventId,
      payload: fullEvent as unknown as Record<string, unknown>,
      status: 'published',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    }
  }

  async recordAndPublish<T extends Partial<BaseDomainEvent> & { type: string }>(
    eventPayload: T,
    dbTransaction?: unknown,
  ): Promise<DomainOutboxRecord> {
    return this.record(eventPayload, dbTransaction)
  }
}
