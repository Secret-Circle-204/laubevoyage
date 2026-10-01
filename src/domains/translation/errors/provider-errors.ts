import type { TranslationProviderId } from '../types'

/**
 * Base domain error for all external translation provider failures.
 * Distinguishes external operational and transport incidents from internal application defects.
 */
export abstract class TranslationProviderError extends Error {
  abstract readonly providerId: TranslationProviderId
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ProviderAuthError extends TranslationProviderError {
  constructor(
    public readonly providerId: TranslationProviderId,
    message: string,
    public readonly status: 401 | 403 = 401
  ) {
    super(`[${providerId}] Authentication/Configuration Failure (HTTP ${status}): ${message}`)
  }
}

/**
 * 403 (403001) / Quota Exceeded / Out of Quota.
 * Distinguishes monthly quota depletion from credential/auth errors.
 */
export class ProviderQuotaExceededError extends TranslationProviderError {
  readonly status = 403
  constructor(
    public readonly providerId: TranslationProviderId,
    message: string
  ) {
    super(`[${providerId}] Quota Exceeded / Exhausted (HTTP 403): ${message}`)
  }
}

/**
 * Client-side transport / request constraint (e.g. GET URL exceeds provider safe transport limit).
 * Distinct from external response errors since the server was never reached.
 */
export class ProviderTransportLimitError extends TranslationProviderError {
  constructor(public readonly providerId: TranslationProviderId, message: string) {
    super(`[${providerId}] Transport / Request Limit Exceeded: ${message}`)
  }
}

/**
 * 429: Rate limit exceeded / throttling.
 * Captures bounded Retry-After or triggers bounded exponential backoff.
 */
export class ProviderRateLimitError extends TranslationProviderError {
  readonly status = 429
  constructor(
    public readonly providerId: TranslationProviderId,
    message: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(`[${providerId}] Rate Limited / Throttled: ${message}`)
  }
}

/**
 * Request timeout (AbortError or socket timeout).
 */
export class ProviderTimeoutError extends TranslationProviderError {
  constructor(public readonly providerId: TranslationProviderId, message: string) {
    super(`[${providerId}] Request Timeout: ${message}`)
  }
}

/**
 * Network / DNS / Connection transport failures.
 */
export class ProviderNetworkError extends TranslationProviderError {
  constructor(public readonly providerId: TranslationProviderId, message: string) {
    super(`[${providerId}] Network Failure: ${message}`)
  }
}

/**
 * 5xx: Upstream server error on provider side.
 */
export class ProviderUnavailableError extends TranslationProviderError {
  constructor(
    public readonly providerId: TranslationProviderId,
    public readonly status: number,
    message: string
  ) {
    super(`[${providerId}] Upstream Unavailable (HTTP ${status}): ${message}`)
  }
}

/**
 * Malformed external response: cardinality mismatch, invalid JSON, or empty payload where content was required.
 */
export class ProviderInvalidResponseError extends TranslationProviderError {
  constructor(public readonly providerId: TranslationProviderId, message: string) {
    super(`[${providerId}] Malformed / Invalid External Response: ${message}`)
  }
}

/**
 * Raised when ALL configured external translation providers have failed / are unavailable.
 * Caught exclusively by the translation resolution facade to trigger safe source-text degradation without cache pollution.
 */
export class TranslationBlackoutError extends Error {
  constructor(message: string) {
    super(`[TranslationProviderPool] All translation providers unavailable: ${message}`)
    this.name = 'TranslationBlackoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Raised when an internal programming bug, illegal state, or internal contract violation is detected.
 * MUST NEVER be masked or sent through provider fallback.
 */
export class ApplicationDefectError extends Error {
  constructor(message: string) {
    super(`[Translation Application Defect] ${message}`)
    this.name = 'ApplicationDefectError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
