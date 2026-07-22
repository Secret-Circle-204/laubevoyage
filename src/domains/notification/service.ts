import type { Payload } from 'payload'
import { NotificationWorkflowEngine } from './workflow'
import type { NotificationChannel, NotificationCategory, NotificationPriority, NotificationAttachment } from './types'

/**
 * Notification Domain Service (Enterprise Thin Facade)
 * Single entry point for all system notification dispatches.
 */
export class NotificationService {
  private workflowEngine: NotificationWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new NotificationWorkflowEngine(payload)
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
    templateData: Record<string, any>
    attachments?: NotificationAttachment[]
    sendAt?: string
    customerId?: number
  }): Promise<{ queued: boolean; jobId: string; reason?: string }> {
    return this.workflowEngine.executeEnqueueWorkflow(params)
  }

  async processNextJob(): Promise<boolean> {
    return this.workflowEngine.worker.processNextJob()
  }
}
