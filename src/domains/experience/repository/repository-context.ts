import type { PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'

/**
 * Normalizes RequestContext or PayloadRequest into a PayloadRequest with transactionID.
 */
export function mapContextToReq(
  context?: RequestContext | PayloadRequest,
): PayloadRequest | undefined {
  if (!context) {
    return undefined
  }
  if (
    'transactionID' in context ||
    'payload' in context ||
    'headers' in context ||
    'user' in context
  ) {
    return context as PayloadRequest
  }
  if (
    'transactionId' in context &&
    context.transactionId !== null &&
    context.transactionId !== undefined
  ) {
    return {
      transactionID: context.transactionId,
    } as unknown as PayloadRequest
  }
  return undefined
}
