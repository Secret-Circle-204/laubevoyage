import type { ITranslationProvider } from '../providers/provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'
import {
  TranslationProviderError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderInvalidResponseError,
  TranslationBlackoutError,
  ApplicationDefectError,
} from '../errors/provider-errors'

export type PoolCircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface ProviderHealthState {
  circuit: PoolCircuitState
  failureCount: number
  consecutiveThrottles: number
  cooldownUntil: number
  probeInFlight: boolean
  lastSuccess?: number
  lastFailure?: number
  lastErrorMessage?: string
}

export class TranslationProviderPool implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'azure'
  private readonly providers: ITranslationProvider[]
  private readonly states: Map<string, ProviderHealthState> = new Map()

  private readonly failureThreshold: number
  private readonly defaultCooldownMs: number
  private readonly minCooldownMs: number = 30000 // 30 seconds minimum bounded cooldown
  private readonly maxCooldownMs: number = 300000 // 5 minutes maximum bounded cooldown

  constructor(
    providers: ITranslationProvider[],
    options?: { failureThreshold?: number; defaultCooldownMs?: number }
  ) {
    this.providers = providers

    // Enforce Azure Primary Invariant: Azure must be index 0 if configured
    const azureIndex = this.providers.findIndex((p) => p.providerId === 'azure')
    if (azureIndex > 0) {
      console.warn(
        `[TranslationProviderPool] Azure provider found at index ${azureIndex}. Enforcing Azure Primary invariant (Azure moved to index 0).`
      )
      const [azure] = this.providers.splice(azureIndex, 1)
      if (azure) {
        this.providers.unshift(azure)
      }
    }

    this.failureThreshold = options?.failureThreshold ?? (Number(process.env.TRANSLATION_FAILURE_THRESHOLD) || 3)
    this.defaultCooldownMs =
      options?.defaultCooldownMs ?? (Number(process.env.TRANSLATION_CIRCUIT_COOLDOWN_MS) || 60000)

    for (const provider of this.providers) {
      this.states.set(provider.providerId, {
        circuit: 'CLOSED',
        failureCount: 0,
        consecutiveThrottles: 0,
        cooldownUntil: 0,
        probeInFlight: false,
      })
    }
  }

  // --- Observability & Introspection for Tests ---
  getRegisteredProviders(): ITranslationProvider[] {
    return [...this.providers]
  }

  getConfiguredProviders(): ITranslationProvider[] {
    return this.providers.filter((p) => {
      if ('isConfigured' in p && typeof (p as any).isConfigured === 'function') {
        return (p as any).isConfigured()
      }
      return true
    })
  }

  getProviderState(providerId: string): ProviderHealthState | undefined {
    const state = this.states.get(providerId)
    if (state) {
      this.evaluateCooldownTransition(providerId, state)
      return { ...state }
    }
    return undefined
  }

  getPoolCircuitState(): PoolCircuitState {
    const configured = this.getConfiguredProviders()
    if (configured.length === 0) return 'OPEN'

    const states = configured.map((p) => this.getProviderState(p.providerId)?.circuit || 'CLOSED')
    if (states.every((s) => s === 'OPEN')) return 'OPEN'
    if (states.some((s) => s === 'HALF_OPEN')) return 'HALF_OPEN'
    return 'CLOSED'
  }

  resetAllCircuitsForTest(): void {
    for (const [_, state] of this.states) {
      state.circuit = 'CLOSED'
      state.failureCount = 0
      state.consecutiveThrottles = 0
      state.cooldownUntil = 0
      state.probeInFlight = false
      state.lastErrorMessage = undefined
    }
  }

  private evaluateCooldownTransition(providerId: string, state: ProviderHealthState): void {
    if (state.circuit === 'OPEN' && Date.now() >= state.cooldownUntil) {
      state.circuit = 'HALF_OPEN'
      state.probeInFlight = false
      console.log(`[TranslationProviderPool] Provider "${providerId}" entering HALF_OPEN probe state.`)
    }
  }

  private recordSuccess(providerId: string): void {
    const state = this.states.get(providerId)
    if (!state) return

    if (state.circuit === 'HALF_OPEN' || state.circuit === 'OPEN') {
      console.log(`[TranslationProviderPool] Provider "${providerId}" recovered to CLOSED. Healthy.`)
    }
    state.circuit = 'CLOSED'
    state.failureCount = 0
    state.consecutiveThrottles = 0
    state.cooldownUntil = 0
    state.probeInFlight = false
    state.lastSuccess = Date.now()
    state.lastErrorMessage = undefined
  }

  private recordFailure(providerId: string, err: TranslationProviderError): void {
    const state = this.states.get(providerId)
    if (!state) return

    state.probeInFlight = false
    state.lastFailure = Date.now()
    state.lastErrorMessage = err.message

    // 1. Authentication / Configuration Incident (401 / 403)
    if (err instanceof ProviderAuthError) {
      const configCooldownMs = 300000 // 5 minutes administrative cooldown
      this.tripProvider(
        providerId,
        state,
        `[CONFIG_INCIDENT] Auth/Configuration Failure (${err.message})`,
        configCooldownMs
      )
      return
    }

    // 2. Throttled / Rate Limited (429)
    if (err instanceof ProviderRateLimitError) {
      state.consecutiveThrottles = (state.consecutiveThrottles || 0) + 1
      let parsedRetryAfterMs: number | undefined
      if (err.retryAfterSeconds && err.retryAfterSeconds > 0) {
        parsedRetryAfterMs = Math.min(err.retryAfterSeconds * 1000, this.maxCooldownMs)
      }

      // Bounded Exponential Backoff on 429: 30s -> 60s -> 120s -> 240s -> max 300s
      const baseThrottleMs = 30000
      const backoffCooldown = baseThrottleMs * Math.pow(2, state.consecutiveThrottles - 1)
      const calculatedCooldown = parsedRetryAfterMs || backoffCooldown
      const boundedCooldown = Math.min(Math.max(calculatedCooldown, this.minCooldownMs), this.maxCooldownMs)

      this.tripProvider(
        providerId,
        state,
        `[EXTERNAL_THROTTLED] HTTP 429 (Rate Limited - Throttle #${state.consecutiveThrottles})`,
        boundedCooldown
      )
      return
    }

    // 3. Transient / Upstream / Timeout / Invalid Response
    state.failureCount++
    if (state.circuit === 'HALF_OPEN' || state.failureCount >= this.failureThreshold) {
      this.tripProvider(providerId, state, err.message, this.defaultCooldownMs)
    }
  }

  private tripProvider(providerId: string, state: ProviderHealthState, reason: string, cooldownMs: number): void {
    const previous = state.circuit
    state.circuit = 'OPEN'
    state.cooldownUntil = Date.now() + cooldownMs
    state.failureCount = this.failureThreshold
    state.probeInFlight = false

    if (previous !== 'OPEN') {
      console.warn(
        `[TranslationProviderPool] Circuit breaker tripped to OPEN for provider "${providerId}". Reason: ${reason}. Cooldown: ${cooldownMs}ms.`
      )
    }
  }

  async translateTextWithProvenance(
    text: string,
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<TranslationResultWithProvenance> {
    if (!text || !text.trim() || targetLocale === sourceLocale) {
      return { text, providerId: 'cache' }
    }

    const configured = this.getConfiguredProviders()
    if (configured.length === 0) {
      throw new TranslationBlackoutError('No translation providers configured in pool')
    }

    let lastError: unknown

    // Strict priority traversal: sequential fallback (Azure -> Google -> Cloudflare)
    for (const provider of configured) {
      const state = this.states.get(provider.providerId)
      if (!state) continue

      this.evaluateCooldownTransition(provider.providerId, state)

      // Skip provider if currently OPEN
      if (state.circuit === 'OPEN') {
        continue
      }

      // If HALF_OPEN, allow only a single probe in flight concurrently
      if (state.circuit === 'HALF_OPEN') {
        if (state.probeInFlight) continue
        state.probeInFlight = true
      }

      try {
        const result = await provider.translateText(text, targetLocale, sourceLocale)
        if (!result || !result.trim()) {
          throw new ProviderInvalidResponseError(provider.providerId, 'Empty translation string returned')
        }
        this.recordSuccess(provider.providerId)
        return { text: result, providerId: provider.providerId }
      } catch (err: unknown) {
        if (err instanceof TranslationProviderError) {
          this.recordFailure(provider.providerId, err)
          lastError = err
          // Proceed to next fallback provider
          continue
        }

        // Internal programming defects MUST NOT be masked or sent through fallback
        throw err
      }
    }

    throw new TranslationBlackoutError(
      `All configured providers failed or are in OPEN circuit state. Last error: ${
        (lastError as any)?.message || lastError
      }`
    )
  }

  async translateText(text: string, targetLocale: string, sourceLocale: string = 'en'): Promise<string> {
    const res = await this.translateTextWithProvenance(text, targetLocale, sourceLocale)
    return res.text
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<BatchTranslationResultWithProvenance> {
    if (!texts || texts.length === 0) return { texts: [], providerId: 'cache' }
    if (targetLocale === sourceLocale) return { texts, providerId: 'cache' }

    const configured = this.getConfiguredProviders()
    if (configured.length === 0) {
      throw new TranslationBlackoutError('No translation providers configured in pool')
    }

    let lastError: unknown

    // Strict priority traversal: sequential fallback (Azure -> Google -> Cloudflare)
    for (const provider of configured) {
      const state = this.states.get(provider.providerId)
      if (!state) continue

      this.evaluateCooldownTransition(provider.providerId, state)

      // Skip provider if currently OPEN
      if (state.circuit === 'OPEN') {
        continue
      }

      // If HALF_OPEN, allow only a single probe in flight concurrently
      if (state.circuit === 'HALF_OPEN') {
        if (state.probeInFlight) continue
        state.probeInFlight = true
      }

      try {
        const results = await provider.translateBatch(texts, targetLocale, sourceLocale)
        if (!Array.isArray(results) || results.length !== texts.length) {
          throw new ProviderInvalidResponseError(
            provider.providerId,
            `Batch provider result count mismatch: expected ${texts.length}, got ${
              Array.isArray(results) ? results.length : typeof results
            }`
          )
        }
        this.recordSuccess(provider.providerId)
        return { texts: results, providerId: provider.providerId }
      } catch (err: unknown) {
        if (err instanceof TranslationProviderError) {
          this.recordFailure(provider.providerId, err)
          lastError = err
          // Proceed to next fallback provider
          continue
        }

        // Internal programming defects MUST NOT be masked or sent through fallback
        throw err
      }
    }

    throw new TranslationBlackoutError(
      `All configured providers failed or are in OPEN circuit state. Last error: ${
        (lastError as any)?.message || lastError
      }`
    )
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    const res = await this.translateBatchWithProvenance(texts, targetLocale, sourceLocale)
    return res.texts
  }
}
