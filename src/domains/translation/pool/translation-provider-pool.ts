import type { ITranslationProvider } from '../providers/provider.interface'
import type { TranslationProviderId } from '../types'

export type PoolCircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface ProviderHealthState {
  circuit: PoolCircuitState
  failureCount: number
  cooldownUntil: number
  probeInFlight: boolean
  lastSuccess?: number
  lastFailure?: number
}

export class TranslationProviderPool implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'azure'
  private readonly providers: ITranslationProvider[]
  private readonly states: Map<string, ProviderHealthState> = new Map()

  private readonly failureThreshold: number
  private readonly defaultCooldownMs: number
  private readonly minCooldownMs: number = 5000
  private readonly maxCooldownMs: number = 300000

  constructor(
    providers: ITranslationProvider[],
    options?: { failureThreshold?: number; defaultCooldownMs?: number }
  ) {
    this.providers = providers
    this.failureThreshold = options?.failureThreshold ?? (Number(process.env.TRANSLATION_FAILURE_THRESHOLD) || 3)
    this.defaultCooldownMs =
      options?.defaultCooldownMs ?? (Number(process.env.TRANSLATION_CIRCUIT_COOLDOWN_MS) || 60000)

    for (const provider of this.providers) {
      this.states.set(provider.providerId, {
        circuit: 'CLOSED',
        failureCount: 0,
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

  resetAllCircuitsForTest(): void {
    for (const [_, state] of this.states) {
      state.circuit = 'CLOSED'
      state.failureCount = 0
      state.cooldownUntil = 0
      state.probeInFlight = false
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
    state.cooldownUntil = 0
    state.probeInFlight = false
    state.lastSuccess = Date.now()
  }

  private recordFailure(providerId: string, err: unknown): void {
    const state = this.states.get(providerId)
    if (!state) return

    state.probeInFlight = false
    state.lastFailure = Date.now()

    const status = (err as any)?.status
    const retryAfter = (err as any)?.retryAfter

    // 1. HTTP 400 and 404 do NOT count towards circuit tripping
    if (status === 400 || status === 404) {
      return
    }

    // 2. HTTP 429 and HTTP 401/403 trip immediately to OPEN
    if (status === 429 || status === 401 || status === 403) {
      let cooldown = this.defaultCooldownMs
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10)
        if (!isNaN(parsed)) {
          cooldown = parsed * 1000
        } else {
          const parsedDate = new Date(retryAfter).getTime()
          if (!isNaN(parsedDate)) {
            cooldown = Math.max(0, parsedDate - Date.now())
          }
        }
      }
      const boundedCooldown = Math.min(Math.max(cooldown, this.minCooldownMs), this.maxCooldownMs)
      this.tripProvider(
        providerId,
        state,
        status === 429 ? 'HTTP 429 (Rate Limited / Quota Exhausted)' : `HTTP ${status} (Auth Failure)`,
        boundedCooldown
      )
      return
    }

    // 3. 5xx, Timeout, Network failure increment failure count
    state.failureCount++
    if (state.circuit === 'HALF_OPEN' || state.failureCount >= this.failureThreshold) {
      const reason = (err as any)?.name === 'AbortError'
        ? 'Request Timeout'
        : status
        ? `HTTP ${status}`
        : err instanceof Error
        ? err.message
        : 'Unknown Provider Failure'
      this.tripProvider(providerId, state, reason, this.defaultCooldownMs)
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

  async translateText(text: string, targetLocale: string, sourceLocale: string = 'en'): Promise<string> {
    if (!text || !text.trim() || targetLocale === sourceLocale) {
      return text
    }

    const configured = this.getConfiguredProviders()
    if (configured.length === 0) {
      const err = new Error(
        '[TranslationProviderPool] All translation providers are currently unavailable or in OPEN circuit state.'
      )
      ;(err as any).status = 503
      throw err
    }

    let lastError: unknown

    // Strict priority traversal: iterate sequentially in configured priority order
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
          throw new Error(`[TranslationProviderPool] Provider "${provider.providerId}" returned empty translation.`)
        }
        this.recordSuccess(provider.providerId)
        return result
      } catch (err: unknown) {
        this.recordFailure(provider.providerId, err)
        lastError = err
      }
    }

    const blackoutErr = new Error(
      `[TranslationProviderPool] All translation providers in the pool failed or are in OPEN circuit state. Last error: ${
        (lastError as any)?.message || lastError
      }`
    )
    ;(blackoutErr as any).status = 503
    throw blackoutErr
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    const configured = this.getConfiguredProviders()
    if (configured.length === 0) {
      const err = new Error(
        '[TranslationProviderPool] All translation providers are currently unavailable or in OPEN circuit state.'
      )
      ;(err as any).status = 503
      throw err
    }

    let lastError: unknown

    // Strict priority traversal: iterate sequentially in configured priority order
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
          throw new Error(
            `[TranslationProviderPool] Provider "${provider.providerId}" returned invalid batch cardinality.`
          )
        }
        this.recordSuccess(provider.providerId)
        return results
      } catch (err: unknown) {
        this.recordFailure(provider.providerId, err)
        lastError = err
      }
    }

    const blackoutErr = new Error(
      `[TranslationProviderPool] All translation providers in the pool failed or are in OPEN circuit state. Last error: ${
        (lastError as any)?.message || lastError
      }`
    )
    ;(blackoutErr as any).status = 503
    throw blackoutErr
  }
}
