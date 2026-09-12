import type {
  AggregatedLoadingState,
  LoadingLevel,
  LoadingOperation,
  LoadingPhase,
  StartLoadingOptions,
} from './types'

/**
 * Pure Functional Engine / Registry for Loading Operations
 * Decoupled from React lifecycle to allow exhaustive deterministic unit testing.
 */
export class LoadingOrchestrator {
  private operations = new Map<string, LoadingOperation>()

  /**
   * Registers a new operation or updates an existing one if dedupeKey matches.
   * Preserves original startedAt timestamp when deduplicating to prevent resetting timers.
   */
  public registerOperation(options: StartLoadingOptions = {}, now: number = Date.now()): LoadingOperation {
    const id = options.id || `load_${now}_${Math.random().toString(36).substring(2, 7)}`
    const dedupeKey = options.dedupeKey

    // Check if an operation with this dedupeKey or id already exists
    let existingKey: string | undefined
    if (dedupeKey) {
      for (const [key, op] of this.operations.entries()) {
        if (op.dedupeKey === dedupeKey) {
          existingKey = key
          break
        }
      }
    } else if (this.operations.has(id)) {
      existingKey = id
    }

    if (existingKey) {
      const existing = this.operations.get(existingKey)!
      const updated: LoadingOperation = {
        id: existing.id,
        dedupeKey: existing.dedupeKey,
        type: options.type || existing.type,
        level: options.level || existing.level,
        startedAt: existing.startedAt, // preserve original start
        generation: options.generation !== undefined ? options.generation : existing.generation,
        metadata: options.metadata ? Object.freeze({ ...options.metadata }) : existing.metadata,
      }
      this.operations.set(existingKey, Object.freeze(updated))
      return updated
    }

    const op: LoadingOperation = {
      id,
      dedupeKey,
      type: options.type || 'custom',
      level: options.level || 1,
      startedAt: now,
      generation: options.generation,
      metadata: options.metadata ? Object.freeze({ ...options.metadata }) : undefined,
    }

    this.operations.set(id, Object.freeze(op))
    return op
  }

  /**
   * Unregisters an operation by ID or dedupeKey.
   * If generation is specified, verifies generation match before unregistering
   * to protect against out-of-order completions during rapid navigation.
   */
  public unregisterOperation(idOrDedupeKey: string, generation?: number): boolean {
    // 1. Direct ID match
    if (this.operations.has(idOrDedupeKey)) {
      const op = this.operations.get(idOrDedupeKey)!
      if (generation !== undefined && op.generation !== undefined && op.generation !== generation) {
        // Generation mismatch: stale completion event from an earlier attempt, ignore!
        return false
      }
      this.operations.delete(idOrDedupeKey)
      return true
    }

    // 2. DedupeKey match
    for (const [key, op] of this.operations.entries()) {
      if (op.dedupeKey === idOrDedupeKey) {
        if (generation !== undefined && op.generation !== undefined && op.generation !== generation) {
          // Stale generation, do not unregister newer attempt
          return false
        }
        this.operations.delete(key)
        return true
      }
    }

    return false
  }

  /**
   * Specifically cleans up a stale navigation operation after safety timeout.
   * GUARANTEE: Never touches or deletes operations with type !== 'navigation'.
   */
  public decayStaleNavigation(idOrDedupeKey: string, generation?: number): boolean {
    for (const [key, op] of this.operations.entries()) {
      if (key === idOrDedupeKey || op.dedupeKey === idOrDedupeKey) {
        // Enforce strict type isolation: only navigation operations can decay
        if (op.type !== 'navigation') {
          return false
        }
        if (generation !== undefined && op.generation !== undefined && op.generation !== generation) {
          return false
        }
        this.operations.delete(key)
        return true
      }
    }
    return false
  }

  public getOperation(idOrDedupeKey: string): LoadingOperation | undefined {
    if (this.operations.has(idOrDedupeKey)) {
      return this.operations.get(idOrDedupeKey)
    }
    for (const op of this.operations.values()) {
      if (op.dedupeKey === idOrDedupeKey) {
        return op
      }
    }
    return undefined
  }

  public getActiveOperations(): readonly LoadingOperation[] {
    return Array.from(this.operations.values())
  }

  public getCount(): number {
    return this.operations.size
  }

  public computeHighestLevel(): LoadingLevel | 0 {
    let highest: LoadingLevel | 0 = 0
    for (const op of this.operations.values()) {
      if (op.level > highest) {
        highest = op.level
      }
    }
    return highest
  }

  public getSnapshot(currentPhase: LoadingPhase = 'idle'): AggregatedLoadingState {
    const active = this.getActiveOperations()
    const count = active.length
    const isActive = count > 0

    return Object.freeze({
      phase: isActive ? currentPhase : 'idle',
      isActive,
      highestLevel: this.computeHighestLevel(),
      operationsCount: count,
      activeOperations: Object.freeze([...active]),
      isProlonged: currentPhase === 'prolonged',
    })
  }

  public clear(): void {
    this.operations.clear()
  }
}
