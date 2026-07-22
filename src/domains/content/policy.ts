import type { ContentPolicyResult } from './types'

/**
 * Pure Content Policy
 * Single source of truth for published vs draft content predicates.
 */
export class ContentPolicy {
  static canPubliclyView(status: 'draft' | 'published'): ContentPolicyResult {
    if (status !== 'published') {
      return {
        allowed: false,
        code: 'CONTENT_UNPUBLISHED',
        reason: 'Content item is in draft status and cannot be publicly viewed.',
      }
    }

    return { allowed: true }
  }
}
