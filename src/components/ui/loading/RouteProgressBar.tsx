'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useGlobalLoading } from '@/providers/loading-provider'

/**
 * RouteProgressBar
 * A luxury, ultra-slim, non-blocking route progress indicator for L'Aube Voyage.
 *
 * Visual & Architectural Invariants:
 * - Positioned at top-0, height 2.5px, fixed and pointer-events-none (zero layout shift).
 * - Driven by GlobalLoadingOrchestrator: respects the 150ms reveal delay (zero flicker on fast routes).
 * - Only displays when an internal route navigation operation is active or finishing.
 * - Branded palette: Dawn Horizon gradient (Deep Blue #2e3192 -> Sky Cyan #00aeef -> Sunrise Gold #f58220).
 * - Automatic bidirectional support: grows left-to-right in LTR, right-to-left in RTL.
 * - Respects prefers-reduced-motion by disabling continuous shimmer and using smooth opacity fade.
 * - 100% SSR-safe: returns null during initial server render and idle states.
 */
export function RouteProgressBar() {
  const { state } = useGlobalLoading()
  const [progress, setProgress] = useState<number>(0)
  const [isFinishing, setIsFinishing] = useState<boolean>(false)
  const [isVisible, setIsVisible] = useState<boolean>(false)

  const wasNavActiveRef = useRef<boolean>(false)
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasNavOperation = state.activeOperations.some((op) => op.type === 'navigation')
  const isRevealedOrProlonged = state.phase === 'revealed' || state.phase === 'prolonged'

  useEffect(() => {
    // 1. Navigation is active and phase has revealed (>150ms delay elapsed)
    if (hasNavOperation && isRevealedOrProlonged) {
      wasNavActiveRef.current = true
      setIsVisible(true)
      setIsFinishing(false)

      // Start initial jump to 25% then smoothly trickle to ~80%
      setProgress((prev) => (prev === 0 ? 25 : prev))

      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
      stepTimerRef.current = setTimeout(() => {
        setProgress((prev) => {
          if (state.phase === 'prolonged') {
            return 90 // In prolonged state (>2.5s), trickle near end
          }
          return Math.max(prev, 75)
        })
      }, 300)
    }
    // 2. Navigation just completed: had an active nav, now activeOperations is 0, but phase still revealed/prolonged
    else if (wasNavActiveRef.current && !hasNavOperation && isRevealedOrProlonged) {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
      setIsFinishing(true)
      setProgress(100)
    }
    // 3. Completely idle: reset everything
    else if (state.phase === 'idle') {
      wasNavActiveRef.current = false
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
      setIsVisible(false)
      setIsFinishing(false)
      setProgress(0)
    }

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    }
  }, [hasNavOperation, isRevealedOrProlonged, state.phase])

  // Zero DOM emission during idle, silent, or non-navigation operations
  if (!isVisible && !isFinishing) {
    return null
  }

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      data-testid="route-progress-bar"
      className={`fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] transition-opacity duration-300 ${
        isFinishing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        data-testid="route-progress-bar-fill"
        className="h-full origin-left rtl:origin-right transition-all duration-300 ease-out bg-gradient-to-r rtl:bg-gradient-to-l from-primary via-secondary to-accent shadow-[0_0_8px_rgba(245,130,32,0.6)] motion-reduce:transition-none"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  )
}
