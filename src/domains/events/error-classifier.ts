import { SubscriberTimeoutError } from './event-bus'
import { DomainException } from '@/domains/shared/exceptions/domain-exception'

export type EventDispatchReasonCode =
  | 'SUBSCRIBER_TIMEOUT'
  | 'DATABASE_DEADLOCK'
  | 'DATABASE_SERIALIZATION_FAILURE'
  | 'DATABASE_TRANSIENT_ERROR'
  | 'NETWORK_TIMEOUT'
  | 'RATE_LIMITED'
  | 'DOWNSTREAM_SERVER_ERROR'
  | 'ENTITY_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'FINANCIAL_INVARIANT_VIOLATION'
  | 'AUTH_CONFIGURATION_ERROR'
  | 'NON_RETRYABLE_DOMAIN_ERROR'
  | 'UNKNOWN_DISPATCH_FAILURE'

export interface ClassifiedDispatchError {
  reasonCode: EventDispatchReasonCode
  isRetryable: boolean
  errorMessage: string
}

/**
 * Event Dispatch Error Classifier
 * Inspects error prototypes, domain exception status codes, postgres error codes,
 * and payload error structures to determine retryability and reason codes without fragile string matching.
 */
export function classifyDispatchError(error: unknown): ClassifiedDispatchError {
  const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown dispatch error')

  // 1. Subscriber Execution Timeout (Transient, Retryable)
  if (error instanceof SubscriberTimeoutError) {
    return {
      reasonCode: error.reasonCode,
      isRetryable: true,
      errorMessage,
    }
  }

  // 2. Extract structured properties safely
  const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null
  const errName = typeof errObj?.name === 'string' ? errObj.name : ''
  const statusCode =
    typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.statusCode === 'number'
        ? errObj.statusCode
        : error instanceof DomainException
          ? error.statusCode
          : null

  const errCode =
    typeof errObj?.code === 'string'
      ? errObj.code
      : error instanceof DomainException
        ? error.code
        : null

  // 3. PostgreSQL Database Error Codes
  if (errCode) {
    // 40P01: deadlock_detected
    if (errCode === '40P01') {
      return { reasonCode: 'DATABASE_DEADLOCK', isRetryable: true, errorMessage }
    }
    // 40001: serialization_failure
    if (errCode === '40001') {
      return { reasonCode: 'DATABASE_SERIALIZATION_FAILURE', isRetryable: true, errorMessage }
    }
    // 57P01, 57P02, 57P03: admin_shutdown, crash_shutdown
    if (errCode.startsWith('57P')) {
      return { reasonCode: 'DATABASE_TRANSIENT_ERROR', isRetryable: true, errorMessage }
    }
    // Node.js network / socket transient errors
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EPIPE'].includes(errCode)) {
      return { reasonCode: 'NETWORK_TIMEOUT', isRetryable: true, errorMessage }
    }
    // 23505: unique_violation, 23503: foreign_key_violation (Structural/Poison)
    if (errCode === '23505' || errCode === '23503') {
      return { reasonCode: 'VALIDATION_FAILED', isRetryable: false, errorMessage }
    }
    // Domain NotFound codes
    if (errCode === 'BOOKING_NOT_FOUND' || errCode === 'CUSTOMER_NOT_FOUND' || errCode === 'ENTITY_NOT_FOUND') {
      return { reasonCode: 'ENTITY_NOT_FOUND', isRetryable: false, errorMessage }
    }
    // Domain Financial Invariant codes
    if (errCode === 'FINANCIAL_INVARIANT_VIOLATION' || errCode === 'INSUFFICIENT_POINTS') {
      return { reasonCode: 'FINANCIAL_INVARIANT_VIOLATION', isRetryable: false, errorMessage }
    }
    // Domain Auth/Credentials codes
    if (errCode === 'UNAUTHORIZED' || errCode === 'INVALID_CREDENTIALS' || errCode === 'EMAIL_NOT_VERIFIED') {
      return { reasonCode: 'AUTH_CONFIGURATION_ERROR', isRetryable: false, errorMessage }
    }
  }

  // 4. HTTP / Domain Status Code Classification
  if (statusCode !== null) {
    if (statusCode === 404 || errName === 'NotFound') {
      return { reasonCode: 'ENTITY_NOT_FOUND', isRetryable: false, errorMessage }
    }
    if (statusCode === 400 || errName === 'ValidationError') {
      return { reasonCode: 'VALIDATION_FAILED', isRetryable: false, errorMessage }
    }
    if (statusCode === 401 || statusCode === 403 || errName === 'AuthenticationError') {
      return { reasonCode: 'AUTH_CONFIGURATION_ERROR', isRetryable: false, errorMessage }
    }
    if (statusCode === 429) {
      return { reasonCode: 'RATE_LIMITED', isRetryable: true, errorMessage }
    }
    if (statusCode >= 500) {
      return { reasonCode: 'DOWNSTREAM_SERVER_ERROR', isRetryable: true, errorMessage }
    }
  }

  // 5. Payload / Named Error Classes
  if (errName === 'NotFound') {
    return { reasonCode: 'ENTITY_NOT_FOUND', isRetryable: false, errorMessage }
  }
  if (errName === 'ValidationError') {
    return { reasonCode: 'VALIDATION_FAILED', isRetryable: false, errorMessage }
  }

  // 6. Check nested cause if present
  if (errObj?.cause && typeof errObj.cause === 'object') {
    const nested = classifyDispatchError(errObj.cause)
    if (nested.reasonCode !== 'UNKNOWN_DISPATCH_FAILURE') {
      return nested
    }
  }

  // 7. Fallback for unclassified errors: Mark as UNKNOWN_DISPATCH_FAILURE and allow bounded retry
  return {
    reasonCode: 'UNKNOWN_DISPATCH_FAILURE',
    isRetryable: true,
    errorMessage,
  }
}
