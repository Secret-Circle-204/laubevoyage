'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { LoadingOrchestrator } from '@/application/loading/orchestrator'
import { DEFAULT_LOADING_POLICY } from '@/application/loading/policy'
import type {
  AggregatedLoadingState,
  LoadingContextValue,
  LoadingPhase,
  LoadingPolicy,
  StartLoadingOptions,
} from '@/application/loading/types'

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined)

export interface LoadingProviderProps {
  children: React.ReactNode
  policy?: Partial<LoadingPolicy>
}

/**
 * Global Loading Provider
 * Central coordinator managing UI loading state, debounce timers, minimum visible durations,
 * and safe isolated navigation decays. Completely decoupled from domain and payment logic.
 */
export function LoadingProvider({ children, policy: customPolicy }: LoadingProviderProps) {
  const policy = useMemo<LoadingPolicy>(
    () => Object.freeze({ ...DEFAULT_LOADING_POLICY, ...customPolicy }),
    [customPolicy]
  )

  const [orchestrator] = useState<LoadingOrchestrator>(() => new LoadingOrchestrator())
  const isMountedRef = useRef<boolean>(true)

  // Timer references
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prolongedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const decayTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Timestamp when the loader was actually revealed to the user
  const revealedAtRef = useRef<number | null>(null)

  // Deterministic initial state for SSR safety (Zero hydration mismatch)
  const [phase, setPhase] = useState<LoadingPhase>('idle')
  const [stateVersion, setStateVersion] = useState<number>(0)

  // Clear timers safely
  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }, [])

  const clearProlongedTimer = useCallback(() => {
    if (prolongedTimerRef.current) {
      clearTimeout(prolongedTimerRef.current)
      prolongedTimerRef.current = null
    }
  }, [])

  const clearMinDurationTimer = useCallback(() => {
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current)
      minDurationTimerRef.current = null
    }
  }, [])

  const clearDecayTimer = useCallback((key: string) => {
    const timer = decayTimersRef.current.get(key)
    if (timer) {
      clearTimeout(timer)
      decayTimersRef.current.delete(key)
    }
  }, [])

  const safeSetPhase = useCallback((newPhase: LoadingPhase) => {
    if (isMountedRef.current) {
      setPhase(newPhase)
      setStateVersion((v) => v + 1)
    }
  }, [])

  const finalizeIdle = useCallback(() => {
    clearRevealTimer()
    clearProlongedTimer()
    clearMinDurationTimer()
    revealedAtRef.current = null
    safeSetPhase('idle')
  }, [clearMinDurationTimer, clearProlongedTimer, clearRevealTimer, safeSetPhase])

  const start = useCallback(
    (options: StartLoadingOptions = {}): string => {
      const wasActive = orchestrator.getCount() > 0
      const op = orchestrator.registerOperation(options)

      // If this is a navigation operation, schedule isolated decay safety timer
      if (op.type === 'navigation') {
        const decayKey = op.dedupeKey || op.id
        clearDecayTimer(decayKey)
        const timer = setTimeout(() => {
          if (!isMountedRef.current) return
          decayTimersRef.current.delete(decayKey)
          const removed = orchestrator.decayStaleNavigation(decayKey, op.generation)
          if (removed && orchestrator.getCount() === 0) {
            finalizeIdle()
          } else if (removed) {
            setStateVersion((v) => v + 1)
          }
        }, policy.navigationSafetyDecayMs)
        decayTimersRef.current.set(decayKey, timer)
      }

      // If this was the first operation, start reveal debounce pipeline
      if (!wasActive) {
        clearMinDurationTimer()
        revealedAtRef.current = null
        safeSetPhase('silent')

        // 1. Reveal delay timer: 0-150ms stays silent (no UI flicker)
        clearRevealTimer()
        revealTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return
          if (orchestrator.getCount() > 0) {
            revealedAtRef.current = Date.now()
            safeSetPhase('revealed')

            // 2. Prolonged operation timer: > 2500ms escalates state
            clearProlongedTimer()
            prolongedTimerRef.current = setTimeout(() => {
              if (!isMountedRef.current) return
              if (orchestrator.getCount() > 0) {
                safeSetPhase('prolonged')
              }
            }, Math.max(0, policy.longOperationThresholdMs - policy.revealDelayMs))
          }
        }, policy.revealDelayMs)
      } else {
        setStateVersion((v) => v + 1)
      }

      return op.id
    },
    [
      clearDecayTimer,
      clearMinDurationTimer,
      clearProlongedTimer,
      clearRevealTimer,
      finalizeIdle,
      orchestrator,
      policy.longOperationThresholdMs,
      policy.navigationSafetyDecayMs,
      policy.revealDelayMs,
      safeSetPhase,
    ]
  )

  const stop = useCallback(
    (idOrDedupeKey: string, generation?: number): void => {
      clearDecayTimer(idOrDedupeKey)

      const removed = orchestrator.unregisterOperation(idOrDedupeKey, generation)
      if (!removed) return

      if (orchestrator.getCount() === 0) {
        // Check if loader was revealed to the user
        const revealedAt = revealedAtRef.current

        if (revealedAt === null) {
          // Stopped before reveal delay (e.g. at 80ms) -> Cancel reveal immediately with zero display
          finalizeIdle()
        } else {
          // Loader is visible -> enforce minimum visible duration to prevent flashing
          const elapsed = Date.now() - revealedAt
          const remaining = policy.minVisibleDurationMs - elapsed

          if (remaining > 0) {
            clearMinDurationTimer()
            minDurationTimerRef.current = setTimeout(() => {
              if (!isMountedRef.current) return
              if (orchestrator.getCount() === 0) {
                finalizeIdle()
              }
            }, remaining)
          } else {
            finalizeIdle()
          }
        }
      } else {
        setStateVersion((v) => v + 1)
      }
    },
    [clearDecayTimer, clearMinDurationTimer, finalizeIdle, orchestrator, policy.minVisibleDurationMs]
  )

  // Cleanup on unmount to prevent leaks and state updates
  useEffect(() => {
    isMountedRef.current = true
    const currentDecayTimers = decayTimersRef.current

    return () => {
      isMountedRef.current = false
      clearRevealTimer()
      clearProlongedTimer()
      clearMinDurationTimer()
      currentDecayTimers.forEach((timer) => clearTimeout(timer))
      currentDecayTimers.clear()
      orchestrator.clear()
    }
  }, [clearMinDurationTimer, clearProlongedTimer, clearRevealTimer, orchestrator])

  // Derive aggregated state snapshot
  const state = useMemo<AggregatedLoadingState>(() => {
    // Reference stateVersion to ensure re-computation when version increments
    void stateVersion
    return orchestrator.getSnapshot(phase)
  }, [orchestrator, phase, stateVersion])

  const contextValue = useMemo<LoadingContextValue>(
    () => ({
      state,
      start,
      stop,
      isPending: state.isActive,
    }),
    [state, start, stop]
  )

  return <LoadingContext.Provider value={contextValue}>{children}</LoadingContext.Provider>
}

export function useGlobalLoading(): LoadingContextValue {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider')
  }
  return context
}

export function useOptionalGlobalLoading(): LoadingContextValue | null {
  return useContext(LoadingContext) ?? null
}

