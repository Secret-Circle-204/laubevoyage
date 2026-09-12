/**
 * Global Loading System Types & Contracts
 * Pure application-layer interfaces for decoupled UI loading orchestration.
 */

export type LoadingType = 'navigation' | 'fetch' | 'action' | 'custom'

export type LoadingPhase = 'idle' | 'silent' | 'revealed' | 'prolonged'

export type LoadingLevel = 1 | 2 | 3 | 4

export interface LoadingOperation {
  readonly id: string
  readonly dedupeKey?: string
  readonly type: LoadingType
  readonly level: LoadingLevel
  readonly startedAt: number
  readonly generation?: number
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface AggregatedLoadingState {
  readonly phase: LoadingPhase
  readonly isActive: boolean
  readonly highestLevel: LoadingLevel | 0
  readonly operationsCount: number
  readonly activeOperations: readonly LoadingOperation[]
  readonly isProlonged: boolean
}

export interface LoadingPolicy {
  readonly revealDelayMs: number
  readonly minVisibleDurationMs: number
  readonly longOperationThresholdMs: number
  readonly navigationSafetyDecayMs: number
}

export interface StartLoadingOptions {
  id?: string
  dedupeKey?: string
  type?: LoadingType
  level?: LoadingLevel
  generation?: number
  metadata?: Record<string, unknown>
}

export interface LoadingContextValue {
  readonly state: AggregatedLoadingState
  readonly start: (options?: StartLoadingOptions) => string
  readonly stop: (idOrDedupeKey: string, generation?: number) => void
  readonly isPending: boolean
}
