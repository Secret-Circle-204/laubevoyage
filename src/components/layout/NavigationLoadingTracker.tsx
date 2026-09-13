'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useGlobalLoading } from '@/providers/loading-provider'
import { isEligibleInternalNavigation } from './navigation-tracker-utils'

/**
 * NavigationLoadingTracker
 * Observes internal link clicks and popstate events to signal route transitions
 * to the GlobalLoadingOrchestrator.
 *
 * SCOPE & LIMITATIONS:
 * - Detects valid internal anchor clicks and browser history navigation (popstate).
 * - Programmatic router transitions (router.push, router.replace, router.refresh)
 *   are not automatically intercepted in Phase 1 and require explicit integration if desired.
 */
export function NavigationLoadingTracker() {
  const { start, stop } = useGlobalLoading()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Generate a stable route identity string
  const searchString = searchParams?.toString() || ''
  const currentRoute = `${pathname || ''}${searchString ? `?${searchString}` : ''}`

  const previousRouteRef = useRef<string>(currentRoute)
  const attemptTokenRef = useRef<number>(0)

  // 1. Completion detection: whenever the route identity changes, commit completion
  useEffect(() => {
    if (previousRouteRef.current !== currentRoute) {
      previousRouteRef.current = currentRoute
      // Stop the matching navigation generation
      stop('nav:route', attemptTokenRef.current)
    }
  }, [currentRoute, stop])

  // 2. Start detection: document click delegation + popstate history changes
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const eligibility = isEligibleInternalNavigation({
        currentUrl: window.location.href,
        targetHref: anchor.getAttribute('href'),
        targetAttr: anchor.getAttribute('target'),
        hasDownload: anchor.hasAttribute('download'),
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        isModifiedClick: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
      })

      if (eligibility.isEligible && eligibility.targetUrl) {
        attemptTokenRef.current += 1
        const currentToken = attemptTokenRef.current

        start({
          dedupeKey: 'nav:route',
          type: 'navigation',
          level: 1,
          generation: currentToken,
          metadata: { targetUrl: eligibility.targetUrl },
        })
      }
    }

    const handlePopState = () => {
      attemptTokenRef.current += 1
      const currentToken = attemptTokenRef.current

      start({
        dedupeKey: 'nav:route',
        type: 'navigation',
        level: 1,
        generation: currentToken,
        metadata: { popstate: true },
      })
    }

    document.addEventListener('click', handleDocumentClick, { capture: true })
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true })
      window.removeEventListener('popstate', handlePopState)
    }
  }, [start])

  return null
}
