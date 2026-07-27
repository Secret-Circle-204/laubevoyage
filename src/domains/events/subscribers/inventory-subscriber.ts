import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { InventoryReservedEvent } from '../experience-events'

/**
 * Inventory Subscriber
 * Listens to InventoryReservedEvent for capacity lock monitoring.
 */
export function registerInventorySubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()

  eventBus.subscribe<InventoryReservedEvent>(
    'INVENTORY_RESERVED',
    'InventorySubscriber.logCapacityLock',
    async (event) => {
      console.log(
        `[InventorySubscriber] Seat capacity lock reserved: Slot ${event.departureId}, ${event.seatsReserved} seats (Hold #${event.holdId})`,
      )
    },
  )
}
