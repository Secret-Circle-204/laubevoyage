import type { LoadingPolicy } from './types'

/**
 * Default Timing Policy for L'Aube Voyage Loading System
 *
 * Rationale:
 * - revealDelayMs: 150ms allows instant and cached requests to complete silently with zero flicker.
 * - minVisibleDurationMs: 300ms guarantees that once a loader reveals, it stays visible long enough
 *   to avoid erratic sub-frame flashing before fading out cleanly.
 * - longOperationThresholdMs: 2500ms escalates state to 'prolonged' to provide network status awareness,
 *   WITHOUT aborting or canceling the underlying business operation.
 * - navigationSafetyDecayMs: 20000ms isolates stale navigation indicators if browser navigation
 *   was silently halted or interrupted without a commit. Strictly scoped to type === 'navigation'.
 */
export const DEFAULT_LOADING_POLICY: Readonly<LoadingPolicy> = Object.freeze({
  revealDelayMs: 150,
  minVisibleDurationMs: 300,
  longOperationThresholdMs: 2500,
  navigationSafetyDecayMs: 20000,
})
