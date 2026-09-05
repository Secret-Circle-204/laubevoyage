import { getDomainServices } from './factory'
import { EventOutboxService } from './events/outbox'

let isWebBootstrapped = false
let isWorkersBootstrapped = false

/**
 * Bootstraps the Web server process.
 * Wires up event subscribers to handle domain events in-process or publish outbox.
 * Safe to run during Next.js server initialization.
 */
export async function bootstrapWebApplication(payloadInstance?: any): Promise<void> {
  if (isWebBootstrapped) return
  isWebBootstrapped = true

  // 1. Resolve domain services container (Composition Root)
  const services = await getDomainServices(payloadInstance)

  // 2. Wire event subscribers (No background worker loops are started)
  await services.system.bootstrapSystem({
    outboxService: EventOutboxService.getInstance(),
    notificationService: services.notification,
    customerService: services.customer,
    loyaltyService: services.loyalty,
  })
}

/**
 * Bootstraps the Background Worker process.
 * Wires subscribers, runs database recovery routines, and launches all background worker loops.
 * Used by standalone worker scripts or persistent background processes.
 */
export async function bootstrapWorkerApplication(payloadInstance?: any): Promise<void> {
  if (isWorkersBootstrapped) return
  isWorkersBootstrapped = true

  // 1. Ensure the web application components and event handlers are wired
  await bootstrapWebApplication(payloadInstance)

  // 2. Start background worker loops and run recovery routines
  const services = await getDomainServices(payloadInstance)

  await services.system.startBackgroundWorkers({
    outboxService: EventOutboxService.getInstance(),
    notificationService: services.notification,
    customerService: services.customer,
    loyaltyService: services.loyalty,
  })
}

/**
 * Cleanly stops all background worker loops.
 * Clears all timer handles and stops background polling immediately.
 */
export async function stopWorkerApplication(payloadInstance?: any): Promise<void> {
  isWorkersBootstrapped = false
  const services = await getDomainServices(payloadInstance)

  await services.system.stopBackgroundWorkers({
    outboxService: EventOutboxService.getInstance(),
    notificationService: services.notification,
    customerService: services.customer,
    loyaltyService: services.loyalty,
  })
}
