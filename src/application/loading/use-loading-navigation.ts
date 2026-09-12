'use client'

import { useRouter } from 'next/navigation'
import { useGlobalLoading } from '@/providers/loading-provider'
import { useCallback } from 'react'

export type LoadingNavigationOptions = Parameters<ReturnType<typeof useRouter>['push']>[1]

/**
 * useLoadingNavigation
 * Minimal, safe programmatic navigation helper for user-initiated search and filter actions.
 *
 * DESIGN INVARIANTS:
 * - NO monkey-patching: delegates 100% to standard Next.js useRouter.
 * - Exposes ONLY the explicitly needed `push` method.
 * - Signals GlobalLoadingOrchestrator before router.push to trigger RouteProgressBar for slow queries (>150ms).
 * - Fast/instant filters remain silent due to the existing 150ms debounce threshold.
 * - Lifecycle completion remains strictly owned by the existing NavigationLoadingTracker.
 */
export function useLoadingNavigation() {
  const router = useRouter()
  const { start } = useGlobalLoading()

  const push = useCallback(
    (href: string, options?: LoadingNavigationOptions) => {
      // 1. Signal navigation operation start before invoking Next.js router
      start({
        dedupeKey: 'nav:route',
        type: 'navigation',
        level: 1,
        metadata: { targetUrl: href, programmatic: true },
      })

      // 2. Invoke standard Next.js router.push with exact arguments
      router.push(href, options)
    },
    [router, start]
  )

  return {
    push,
  }
}
