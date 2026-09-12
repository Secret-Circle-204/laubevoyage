import { describe, it, expect } from 'vitest'
import { isEligibleInternalNavigation } from '@/components/layout/navigation-tracker-utils'

describe('Navigation Eligibility Utility Unit Tests', () => {
  const currentUrl = 'https://laubevoyage.com/destinations'

  it('approves standard internal links to different pages', () => {
    const result = isEligibleInternalNavigation({
      currentUrl,
      targetHref: '/experiences',
      button: 0,
    })

    expect(result.isEligible).toBe(true)
    expect(result.targetUrl).toBe('/experiences')
  })

  it('rejects identical destination URL to avoid fake loading states', () => {
    const result = isEligibleInternalNavigation({
      currentUrl,
      targetHref: '/destinations',
      button: 0,
    })

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('identical_destination_url')
  })

  it('approves same pathname when query params differ (e.g. search filter update)', () => {
    const result = isEligibleInternalNavigation({
      currentUrl: 'https://laubevoyage.com/destinations?page=1',
      targetHref: '/destinations?page=2',
      button: 0,
    })

    expect(result.isEligible).toBe(true)
    expect(result.targetUrl).toBe('/destinations?page=2')
  })

  it('rejects external links with different origin', () => {
    const result = isEligibleInternalNavigation({
      currentUrl,
      targetHref: 'https://external-site.com/about',
      button: 0,
    })

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('external_origin')
  })

  it('rejects hash-only navigation anchors', () => {
    const result = isEligibleInternalNavigation({
      currentUrl,
      targetHref: '#atmosphere',
      button: 0,
    })

    expect(result.isEligible).toBe(false)
    expect(result.reason).toBe('ignored_protocol_or_hash')
  })

  it('rejects pseudo-protocols like mailto, tel, javascript', () => {
    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: 'mailto:concierge@laubevoyage.com',
        button: 0,
      }).isEligible
    ).toBe(false)

    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: 'tel:+20100000000',
        button: 0,
      }).isEligible
    ).toBe(false)

    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: 'javascript:void(0)',
        button: 0,
      }).isEligible
    ).toBe(false)
  })

  it('rejects links with target="_blank" or download attribute', () => {
    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/terms',
        targetAttr: '_blank',
        button: 0,
      }).isEligible
    ).toBe(false)

    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/itinerary.pdf',
        hasDownload: true,
        button: 0,
      }).isEligible
    ).toBe(false)
  })

  it('rejects clicks when modifier keys are pressed (Cmd/Ctrl/Shift/Alt to open new tab)', () => {
    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/experiences',
        button: 0,
        isModifiedClick: true,
      }).isEligible
    ).toBe(false)
  })

  it('rejects non-primary mouse button clicks (right-click, middle-click)', () => {
    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/experiences',
        button: 1, // middle click
      }).isEligible
    ).toBe(false)

    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/experiences',
        button: 2, // right click
      }).isEligible
    ).toBe(false)
  })

  it('rejects events where default was already prevented', () => {
    expect(
      isEligibleInternalNavigation({
        currentUrl,
        targetHref: '/experiences',
        defaultPrevented: true,
        button: 0,
      }).isEligible
    ).toBe(false)
  })
})
