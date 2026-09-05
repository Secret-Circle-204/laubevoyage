import type { Payload } from 'payload'
import { TranslationRepository } from '@/domains/translation/repository'
import { rateRegistry } from '@/domains/currency/rate-registry'
import { catalogRegistry } from '@/domains/currency/catalog-registry'
import { LanguageRepository } from '@/domains/languages/repository'
import { countryCatalogRegistry } from '@/domains/destination/country-registry'
import { systemSettingsRegistry } from '@/domains/system/settings-registry'
import { loyaltyProgramRegistry } from '@/domains/loyalty/program-registry'
import { ContentCacheManager } from '@/domains/content/cache-manager'

export const CACHE_INVALIDATION_CHANNEL = 'laube_cache_invalidation'
const COORDINATOR_GLOBAL_KEY = Symbol.for('laube.cache.coordinator.instance')

export interface CacheInvalidationPayload {
  type: 'translation' | 'currency' | 'language' | 'destination' | 'system' | 'content'
  hash?: string
  lang?: string
  slug?: string
  countryCode?: string
  timestamp?: number
}

/**
 * Distributed Cache Invalidation Coordinator
 * Manages real-time PostgreSQL LISTEN/NOTIFY broadcast coordination across all Node.js execution runtimes.
 * Provides resilient auto-reconnect, 4-step startup reconciliation, and transaction-bound NOTIFY dispatches.
 */
export class CacheInvalidationCoordinator {
  private static instance: CacheInvalidationCoordinator | null = null
  private payload: Payload
  private pool: any
  private listenClient: any = null
  private isListening = false
  private isConnecting = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0

  private constructor(payload: Payload) {
    this.payload = payload
    const db = (payload as any).db
    this.pool = db?.pool

    // Register process shutdown hooks for clean connection release
    if (typeof process !== 'undefined') {
      const cleanup = () => this.stop()
      process.once('SIGTERM', cleanup)
      process.once('SIGINT', cleanup)
    }
  }

  public static getInstance(payload?: Payload): CacheInvalidationCoordinator {
    const globalContext = globalThis as unknown as Record<typeof COORDINATOR_GLOBAL_KEY, CacheInvalidationCoordinator>

    if (!globalContext[COORDINATOR_GLOBAL_KEY]) {
      if (!payload) {
        throw new Error('[CacheInvalidationCoordinator] Cannot instantiate without Payload instance on cold boot.')
      }
      const instance = new CacheInvalidationCoordinator(payload)
      globalContext[COORDINATOR_GLOBAL_KEY] = instance
      CacheInvalidationCoordinator.instance = instance
    }

    return globalContext[COORDINATOR_GLOBAL_KEY]
  }

  /**
   * Initializes the dedicated PostgreSQL LISTEN connection.
   * Safe to call multiple times (guarded for idempotency and HMR).
   */
  public async start(): Promise<void> {
    if (this.isListening || this.isConnecting) return
    if (!this.pool || typeof this.pool.connect !== 'function') {
      console.warn('[CacheInvalidationCoordinator] Database pool not ready for LISTEN. Coordination disabled in this context.')
      return
    }

    this.isConnecting = true

    try {
      this.listenClient = await this.pool.connect()

      // 1. Enter LISTEN mode on the dedicated channel
      await this.listenClient.query(`LISTEN ${CACHE_INVALIDATION_CHANNEL}`)
      this.isListening = true
      this.isConnecting = false
      this.reconnectAttempts = 0

      // 2. Attach notification and connection lifecycle handlers
      this.listenClient.on('notification', (msg: any) => {
        if (msg.channel === CACHE_INVALIDATION_CHANNEL && msg.payload) {
          this.handleNotification(msg.payload)
        }
      })

      this.listenClient.on('error', (err: any) => {
        console.error('[CacheInvalidationCoordinator] Dedicated LISTEN client encountered error:', err?.message || err)
        this.handleDisconnect()
      })

      this.listenClient.on('end', () => {
        this.handleDisconnect()
      })

      // 3. 4-Step Protocol: Initial Reconciliation Sweep upon connection establishment
      this.reconcileLocalCaches('INITIAL_STARTUP')

      if (process.env.ARCH_TRACE === 'true' || process.env.NODE_ENV !== 'production') {
        console.log(`[CacheInvalidationCoordinator] ✅ PostgreSQL LISTEN active on channel [${CACHE_INVALIDATION_CHANNEL}] (PID: ${process.pid})`)
      }
    } catch (err: any) {
      this.isConnecting = false
      console.error('[CacheInvalidationCoordinator] Failed to acquire LISTEN connection:', err?.message || err)
      this.scheduleReconnect()
    }
  }

  /**
   * Reconciles (evicts) all local L1 RAM caches to eliminate any mutation gap during startup/reconnect.
   */
  private reconcileLocalCaches(reason: string): void {
    try {
      // Clear all local in-memory L1 caches in this Node process
      TranslationRepository.evictAll()
      rateRegistry.invalidate()
      catalogRegistry.invalidate()
      LanguageRepository.invalidateAll()
      countryCatalogRegistry.invalidate()
      systemSettingsRegistry.invalidate()
      loyaltyProgramRegistry.invalidate()
    } catch (err) {
      console.error(`[CacheInvalidationCoordinator] Error during ${reason} cache reconciliation:`, err)
    }
  }

  private handleDisconnect(): void {
    if (!this.isListening) return
    this.isListening = false
    this.isConnecting = false

    if (this.listenClient) {
      try {
        this.listenClient.removeAllListeners()
        this.listenClient.release(true) // Force release destroyed client
      } catch {}
      this.listenClient = null
    }

    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      console.log(`[CacheInvalidationCoordinator] 🔄 Attempting to re-establish LISTEN connection (Attempt #${this.reconnectAttempts})...`)
      await this.start()
    }, delay)
  }

  /**
   * Dispatches targeted RAM cache eviction upon receiving real-time NOTIFY message.
   */
  private handleNotification(rawPayload: string): void {
    try {
      const data = JSON.parse(rawPayload) as CacheInvalidationPayload
      if (!data || !data.type) return

      switch (data.type) {
        case 'translation':
          if (data.hash && data.lang) {
            TranslationRepository.evictAll(data.hash, data.lang)
          }
          break

        case 'currency':
          rateRegistry.invalidate()
          catalogRegistry.invalidate()
          break

        case 'language':
          LanguageRepository.invalidateAll()
          break

        case 'destination':
          countryCatalogRegistry.invalidate()
          break

        case 'system':
          systemSettingsRegistry.invalidate()
          loyaltyProgramRegistry.invalidate()
          break

        case 'content':
          if (data.slug) {
            ContentCacheManager.invalidateAndRevalidate(data.slug)
          }
          break
      }
    } catch (err) {
      console.error('[CacheInvalidationCoordinator] Failed parsing cache invalidation payload:', err)
    }
  }

  /**
   * Broadcasts a cache invalidation signal via PostgreSQL NOTIFY.
   * If an active transaction client is provided, NOTIFY executes within that transaction,
   * guaranteeing delivery strictly upon successful database commit.
   */
  public async publish(payload: CacheInvalidationPayload, dbTx?: any): Promise<void> {
    const serialized = JSON.stringify({ ...payload, timestamp: Date.now() })

    try {
      // 1. If inside an active transaction client, execute within transaction
      if (dbTx && typeof dbTx.query === 'function') {
        await dbTx.query(`SELECT pg_notify($1, $2)`, [CACHE_INVALIDATION_CHANNEL, serialized])
        return
      }

      // 2. Otherwise execute via connection pool
      if (this.pool && typeof this.pool.query === 'function') {
        await this.pool.query(`SELECT pg_notify($1, $2)`, [CACHE_INVALIDATION_CHANNEL, serialized])
      }
    } catch (err: any) {
      console.error('[CacheInvalidationCoordinator] Error publishing NOTIFY signal:', err?.message || err)
    }
  }

  /**
   * Cleanly closes the dedicated listener on application shutdown.
   */
  public async stop(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.listenClient) {
      try {
        await this.listenClient.query(`UNLISTEN *`)
        this.listenClient.release()
      } catch {}
      this.listenClient = null
    }

    this.isListening = false
    this.isConnecting = false
  }
}
