'use client'

import React, { useEffect } from 'react'
import { useGlobalLoading } from '@/providers/loading-provider'
import { FullScreenLoadingScreen } from './FullScreenLoadingScreen'

/**
 * FullScreenLoadingOverlay
 * Client-side global navigation overlay for prolonged route transitions (>2.5s)
 * or explicit high-priority blocking operations (level >= 3).
 *
 * Distinct Responsibilities:
 * - RouteProgressBar handles fast and normal navigations (150ms - 2500ms) with a sleek non-blocking top bar.
 * - FullScreenLoadingOverlay activates ONLY when a navigation becomes prolonged or requires full-screen blocking.
 * - Automatically locks body scroll while visible, and cleanly restores it on completion or unmount.
 * - Disappears immediately when the global loading orchestrator returns to idle.
 */
export function FullScreenLoadingOverlay() {
  const { state } = useGlobalLoading()

  // Determine if full-screen overlay is needed:
  // 1. Explicit high-level blocking operation (level >= 3 or metadata.fullScreen)
  // 2. Prolonged navigation transition (>2.5s)
  const hasBlockingOperation = state.activeOperations.some(
    (op) => op.level >= 3 || op.metadata?.fullScreen === true
  )
  const isProlongedNavigation =
    state.phase === 'prolonged' &&
    state.activeOperations.some((op) => op.type === 'navigation')

  const shouldShow = state.isActive && (hasBlockingOperation || isProlongedNavigation)

  // Manage body scroll locking safely as a pure side effect without leaking
  useEffect(() => {
    if (!shouldShow) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [shouldShow])

  if (!shouldShow) {
    return null
  }

  return (
    <div
      data-testid="full-screen-loading-overlay"
      className="fixed inset-0 z-[70] transition-opacity duration-500 ease-out pointer-events-auto"
    >
      <FullScreenLoadingScreen />
    </div>
  )
}
