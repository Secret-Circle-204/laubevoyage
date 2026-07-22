import type { PaymentRepository } from './repository'
import type { WebhookLedgerRecord } from './types'

/**
 * Payment Webhook Ledger (Database-First)
 * Primary source of truth is the database via PaymentRepository.
 * Prevents duplicate webhook execution across multi-server horizontally-scaled instances.
 */
export class PaymentWebhookLedger {
  private repository: PaymentRepository
  private memoryCache: Set<string> = new Set()

  constructor(repository: PaymentRepository) {
    this.repository = repository
  }

  /**
   * Check if a gateway webhook event ID has already been processed.
   */
  async isProcessed(eventId: string): Promise<boolean> {
    // 1. Check in-memory accelerator
    if (this.memoryCache.has(eventId)) {
      return true
    }

    // 2. Query primary database repository
    const record = await this.repository.findWebhookByEventId(eventId)
    if (record) {
      this.memoryCache.add(eventId)
      return true
    }

    return false
  }

  /**
   * Record a processed webhook event ID.
   */
  async recordProcessed(transactionId: string, webhook: WebhookLedgerRecord): Promise<void> {
    this.memoryCache.add(webhook.eventId)
    await this.repository.appendWebhook(transactionId, webhook)
  }
}
