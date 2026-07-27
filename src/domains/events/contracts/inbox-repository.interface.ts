export interface IInboxRepository {
  /**
   * Atomically acquires processing lock for a subscriber and event ID.
   * Uses a UNIQUE constraint (processedEventId + subscriberName) in DB.
   * Returns true if acquisition succeeded (proceed with processing).
   * Returns false if duplicate (event already acquired/processed, skip execution).
   */
  tryAcquire(eventId: string, subscriberName: string, dbTransaction?: unknown): Promise<boolean>
}
