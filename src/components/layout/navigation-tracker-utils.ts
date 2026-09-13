/**
 * Pure Utility for Navigation Eligibility Checking
 * Decoupled from DOM events for 100% testability across all edge cases.
 */

export interface NavigationEligibilityCheckParams {
  currentUrl: string
  targetHref: string | null | undefined
  targetAttr?: string | null
  hasDownload?: boolean
  defaultPrevented?: boolean
  button?: number
  isModifiedClick?: boolean
}

export interface NavigationEligibilityResult {
  readonly isEligible: boolean
  readonly targetUrl?: string
  readonly reason?: string
}

export function isEligibleInternalNavigation(
  params: NavigationEligibilityCheckParams
): NavigationEligibilityResult {
  if (params.defaultPrevented) {
    return { isEligible: false, reason: 'default_prevented' }
  }

  if (params.button !== undefined && params.button !== 0) {
    return { isEligible: false, reason: 'non_primary_button' }
  }

  if (params.isModifiedClick) {
    return { isEligible: false, reason: 'modifier_key_pressed' }
  }

  if (!params.targetHref) {
    return { isEligible: false, reason: 'missing_href' }
  }

  const rawHref = params.targetHref.trim()
  if (
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:') ||
    rawHref.startsWith('javascript:')
  ) {
    return { isEligible: false, reason: 'ignored_protocol_or_hash' }
  }

  if (params.targetAttr && params.targetAttr !== '_self') {
    return { isEligible: false, reason: 'non_self_target' }
  }

  if (params.hasDownload) {
    return { isEligible: false, reason: 'download_attribute_present' }
  }

  try {
    const currentParsed = new URL(params.currentUrl)
    const targetParsed = new URL(rawHref, params.currentUrl)

    if (targetParsed.origin !== currentParsed.origin) {
      return { isEligible: false, reason: 'external_origin' }
    }

    // Exact page matching: same pathname and search query means no route transition needed
    if (
      targetParsed.pathname === currentParsed.pathname &&
      targetParsed.search === currentParsed.search
    ) {
      return { isEligible: false, reason: 'identical_destination_url' }
    }

    return {
      isEligible: true,
      targetUrl: `${targetParsed.pathname}${targetParsed.search}`,
    }
  } catch {
    return { isEligible: false, reason: 'invalid_url' }
  }
}
