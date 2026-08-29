import type { Payload, PayloadRequest } from 'payload'
import { NotificationWorkflowEngine } from './workflow'
import { NotificationRepository } from './repository'
import type {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  NotificationAttachment,
  NotificationJobEntity,
} from './types'

/**
 * Notification Domain Service (Enterprise Thin Facade)
 * Single entry point for all system notification dispatches via Dependency Injection.
 */
export class NotificationService {
  private workflowEngine: NotificationWorkflowEngine

  constructor(repository: NotificationRepository | Payload) {
    this.workflowEngine = new NotificationWorkflowEngine(repository)
  }

  async enqueueNotification(params: {
    referenceType: string
    referenceId: string
    recipient: string
    channel: NotificationChannel
    category: NotificationCategory
    priority?: NotificationPriority
    templateId: string
    translationKey: string
    templateData: Record<string, unknown>
    attachments?: NotificationAttachment[]
    sendAt?: string
    customerId?: number
  }, context?: import('@/types').RequestContext | PayloadRequest): Promise<{ queued: boolean; jobId: string; reason?: string }> {
    return this.workflowEngine.executeEnqueueWorkflow(params, context)
  }

  async processNextJob(): Promise<boolean> {
    return this.workflowEngine.worker.processNextJob()
  }

  async getNotificationsByRecipient(
    recipient: string,
    page: number = 1,
    limit: number = 20,
    filters?: { category?: NotificationCategory },
  ): Promise<import('@/types').PaginatedResponse<NotificationJobEntity>> {
    return this.workflowEngine.repository.findByRecipient(recipient, page, limit, filters)
  }

  async getBookingNotificationRecipients(req?: PayloadRequest): Promise<string[]> {
    return this.workflowEngine.repository.getBookingNotificationRecipients(req)
  }

  public startWorker(): void {
    const symbol = Symbol.for('laube.notification.worker.started')
    if ((global as any)[symbol]) return
    ;(global as any)[symbol] = true

    setInterval(() => {
      this.workflowEngine.worker.processNextJob().catch((err) => {
        console.error('[NotificationWorker] Execution error:', err)
      })
    }, 5000)

    if (process.env.ARCH_TRACE === 'true') {
      console.log('[NotificationService] NotificationWorker started successfully (5s interval).')
    }
  }
}
