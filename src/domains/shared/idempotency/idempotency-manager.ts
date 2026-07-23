/**
 * Universal Idempotency Manager
 * Prevents duplicate processing of financial payments, loyalty credits, invoices, and webhooks
 */
export class IdempotencyManager {
  private static processedKeys: Set<string> = new Set()

  public static isProcessed(idempotencyKey: string): boolean {
    return this.processedKeys.has(idempotencyKey)
  }

  public static markProcessed(idempotencyKey: string): void {
    this.processedKeys.add(idempotencyKey)
  }
}
