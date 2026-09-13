import type { DomainServices } from './factory'
import { getDomainServices } from './factory'
import { EventOutboxService } from './events/outbox'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const BOOTSTRAP_STATE_KEY = Symbol.for('laube.system.bootstrap.state')

export type BootstrapStatus = 'idle' | 'bootstrapping' | 'bootstrapped' | 'failed'

interface BootstrapState {
  webStatus: BootstrapStatus
  workersStatus: BootstrapStatus
  webPromise: Promise<BootstrapResult> | null
  workersPromise: Promise<void> | null
  webSubscribersCount: number
  lastError: Error | null
}

function getBootstrapState(): BootstrapState {
  const g = globalThis as unknown as Record<typeof BOOTSTRAP_STATE_KEY, BootstrapState>
  if (!g[BOOTSTRAP_STATE_KEY]) {
    g[BOOTSTRAP_STATE_KEY] = {
      webStatus: 'idle',
      workersStatus: 'idle',
      webPromise: null,
      workersPromise: null,
      webSubscribersCount: 0,
      lastError: null,
    }
  }
  return g[BOOTSTRAP_STATE_KEY]
}

export interface BootstrapOptions {
  outboxService?: EventOutboxService
  notificationService?: any
  customerService?: any
  loyaltyService?: any
}

export interface BootstrapResult {
  success: boolean
  mode: 'operational' | 'build-noop' | 'already-bootstrapped'
  subscribersCount: number
}

/**
 * APPLICATION LIFECYCLE BOOTSTRAP (Sole Authoritative Owner)
 * Wires up master event subscribers and starts PostgreSQL LISTEN coordination.
 * Strictly forbidden from running during Next.js build phase (0ms NO-OP).
 * Thread-safe with concurrency deduplication and self-healing retry on failure.
 */
export async function bootstrapApplication(
  container: DomainServices,
  options?: BootstrapOptions
): Promise<BootstrapResult> {
  // 1. Immutable Build Phase Guard: NO-OP during static page generation
  if (
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    process.env.npm_lifecycle_event === 'build'
  ) {
    return { success: true, mode: 'build-noop', subscribersCount: 0 }
  }

  const state = getBootstrapState()

  // 2. Already bootstrapped in this process
  if (state.webStatus === 'bootstrapped') {
    return {
      success: true,
      mode: 'already-bootstrapped',
      subscribersCount: state.webSubscribersCount,
    }
  }

  // 3. Concurrency deduplication: join existing in-flight bootstrap execution
  if (state.webStatus === 'bootstrapping' && state.webPromise) {
    return state.webPromise
  }

  // 4. Launch authoritative bootstrap execution
  state.webStatus = 'bootstrapping'
  state.webPromise = (async () => {
    try {
      // Wire master event subscribers
      const bootstrapRes = await container.system.bootstrapSystem({
        outboxService: options?.outboxService || EventOutboxService.getInstance(),
        notificationService: options?.notificationService || container.notification,
        customerService: options?.customerService || container.customer,
        loyaltyService: options?.loyaltyService || container.loyalty,
      })

      // Start Distributed Cache Coordination (PostgreSQL LISTEN) - Persistent Node runtimes only
      try {
        const { CacheInvalidationCoordinator } = await import(
          './events/coordination/cache-coordinator'
        )
        const coordinator = CacheInvalidationCoordinator.getInstance(container.payload)
        await coordinator.start()
      } catch (err: unknown) {
        console.warn(
          '[Bootstrap] Distributed cache coordination non-fatal start warning:',
          err instanceof Error ? err.message : String(err),
        )
      }

      state.webStatus = 'bootstrapped'
      state.webSubscribersCount = bootstrapRes.eventSubscribersCount
      state.lastError = null

      return {
        success: true,
        mode: 'operational',
        subscribersCount: bootstrapRes.eventSubscribersCount,
      }
    } catch (err: unknown) {
      // Reset state to 'failed' to allow subsequent self-healing retry
      state.webStatus = 'failed'
      state.lastError = err instanceof Error ? err : new Error(String(err))
      throw err
    } finally {
      state.webPromise = null
    }
  })()

  return state.webPromise
}

/**
 * Backward-compatible helper for legacy or external callers
 */
export async function bootstrapWebApplication(containerOrPayload?: any): Promise<void> {
  let container: DomainServices
  if (containerOrPayload && containerOrPayload.system && containerOrPayload.payload) {
    container = containerOrPayload
  } else {
    container = await getDomainServices(containerOrPayload)
  }
  await bootstrapApplication(container)
}

/**
 * Bootstraps the Background Worker process.
 * Wires subscribers, runs database recovery routines, and launches all background worker loops.
 */
export async function bootstrapWorkerApplication(containerOrPayload?: any): Promise<void> {
  let container: DomainServices
  if (containerOrPayload && containerOrPayload.system && containerOrPayload.payload) {
    container = containerOrPayload
  } else {
    container = await getDomainServices(containerOrPayload)
  }

  const state = getBootstrapState()
  if (state.workersStatus === 'bootstrapped') return
  if (state.workersStatus === 'bootstrapping' && state.workersPromise) {
    return state.workersPromise
  }

  state.workersStatus = 'bootstrapping'
  state.workersPromise = (async () => {
    try {
      // 1. Ensure web subscribers are wired
      await bootstrapApplication(container)

      // 2. Start background worker loops and run recovery routines
      await container.system.startBackgroundWorkers({
        outboxService: EventOutboxService.getInstance(),
        notificationService: container.notification,
        customerService: container.customer,
        loyaltyService: container.loyalty,
      })
      state.workersStatus = 'bootstrapped'
    } catch (err) {
      state.workersStatus = 'failed'
      throw err
    } finally {
      state.workersPromise = null
    }
  })()

  return state.workersPromise
}

/**
 * Cleanly stops all background worker loops.
 * Clears all timer handles and stops background polling immediately.
 */
export async function stopWorkerApplication(containerOrPayload?: any): Promise<void> {
  const state = getBootstrapState()
  state.workersStatus = 'idle'

  let container: DomainServices
  if (containerOrPayload && containerOrPayload.system && containerOrPayload.payload) {
    container = containerOrPayload
  } else {
    container = await getDomainServices(containerOrPayload)
  }

  await container.system.stopBackgroundWorkers({
    outboxService: EventOutboxService.getInstance(),
  })
}

/**
 * Cleanly stops the application and releases dedicated PostgreSQL LISTEN clients.
 */
export async function stopApplication(containerOrPayload?: any): Promise<void> {
  const state = getBootstrapState()
  state.webStatus = 'idle'
  state.workersStatus = 'idle'
  state.lastError = null

  let container: DomainServices
  if (containerOrPayload && containerOrPayload.system && containerOrPayload.payload) {
    container = containerOrPayload
  } else {
    container = await getDomainServices(containerOrPayload)
  }

  try {
    const { CacheInvalidationCoordinator } = await import('./events/coordination/cache-coordinator')
    const coordinator = CacheInvalidationCoordinator.getInstance(container.payload)
    await coordinator.stop()
  } catch {}
}


