import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '@/domains/events/event-bus'

describe('System Domain: EventBus HMR Simulation Unit Tests', () => {
  it('should preserve global singleton and avoid duplicate handlers via Idempotent Subscribe', async () => {
    // 1. Get EventBus instance
    const eventBus = EventBus.getInstance()

    // 2. Register first handler for CUSTOMER_REGISTERED
    const firstHandler = vi.fn()
    eventBus.subscribe('CUSTOMER_REGISTERED', 'welcome-bonus-subscriber', firstHandler)

    // 3. Register second handler with the SAME subscriber ID (simulating hot reload code swap)
    const secondHandler = vi.fn()
    eventBus.subscribe('CUSTOMER_REGISTERED', 'welcome-bonus-subscriber', secondHandler)

    const testEvent = {
      eventId: 'evt_test_1',
      correlationId: 'corr_test_1',
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'CUSTOMER_REGISTERED',
      customerId: 42,
    }

    // 4. Publish event
    await eventBus.publish(testEvent)

    // 5. Assert: only the SECOND (updated) handler should be called, and called only once!
    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledTimes(1)
    expect(secondHandler).toHaveBeenCalledWith(testEvent)
  })
})
