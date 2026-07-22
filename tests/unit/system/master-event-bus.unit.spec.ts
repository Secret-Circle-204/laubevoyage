import { describe, it, expect, vi } from 'vitest'
import { MasterEventBus } from '@/domains/system/master-event-bus'

describe('System Domain: Master Event Bus Unit Tests', () => {
  it('should subscribe and publish events across domain boundaries', async () => {
    MasterEventBus.clearSubscribers()

    const listener = vi.fn()
    MasterEventBus.subscribe('BOOKING_CONFIRMED', listener)

    await MasterEventBus.publish('BOOKING_CONFIRMED', { bookingId: 101, amount: 5000 })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ bookingId: 101, amount: 5000 })
  })
})
