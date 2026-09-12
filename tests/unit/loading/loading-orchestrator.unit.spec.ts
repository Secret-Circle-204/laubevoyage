import { describe, it, expect } from 'vitest'
import { LoadingOrchestrator } from '@/application/loading/orchestrator'

describe('LoadingOrchestrator Unit Tests', () => {
  it('registers new operation with correct defaults and metadata', () => {
    const orchestrator = new LoadingOrchestrator()
    const now = 1000
    const op = orchestrator.registerOperation(
      {
        dedupeKey: 'nav:route',
        type: 'navigation',
        level: 1,
        generation: 1,
        metadata: { targetUrl: '/destinations' },
      },
      now
    )

    expect(op.id).toBeDefined()
    expect(op.dedupeKey).toBe('nav:route')
    expect(op.type).toBe('navigation')
    expect(op.level).toBe(1)
    expect(op.startedAt).toBe(1000)
    expect(op.generation).toBe(1)
    expect(op.metadata?.targetUrl).toBe('/destinations')

    expect(orchestrator.getCount()).toBe(1)
    expect(orchestrator.computeHighestLevel()).toBe(1)
  })

  it('deduplicates operations with the same dedupeKey and preserves original startedAt', () => {
    const orchestrator = new LoadingOrchestrator()
    const op1 = orchestrator.registerOperation(
      { dedupeKey: 'nav:route', generation: 1, metadata: { targetUrl: '/page-1' } },
      1000
    )

    // Second click on another route 50ms later with generation 2
    const op2 = orchestrator.registerOperation(
      { dedupeKey: 'nav:route', generation: 2, metadata: { targetUrl: '/page-2' } },
      1050
    )

    expect(orchestrator.getCount()).toBe(1)
    expect(op2.id).toBe(op1.id)
    expect(op2.generation).toBe(2)
    expect(op2.metadata?.targetUrl).toBe('/page-2')
    // Crucial: original startedAt is preserved to maintain true elapsed time
    expect(op2.startedAt).toBe(1000)
  })

  it('computes highestLevel dynamically across concurrent operations', () => {
    const orchestrator = new LoadingOrchestrator()

    const navOp = orchestrator.registerOperation({ id: 'nav-1', level: 1, type: 'navigation' })
    expect(orchestrator.computeHighestLevel()).toBe(1)

    const fetchOp = orchestrator.registerOperation({ id: 'fetch-1', level: 3, type: 'fetch' })
    expect(orchestrator.computeHighestLevel()).toBe(3)

    // Unregister high level operation -> highest level drops back to remaining operation level
    orchestrator.unregisterOperation(fetchOp.id)
    expect(orchestrator.computeHighestLevel()).toBe(1)

    orchestrator.unregisterOperation(navOp.id)
    expect(orchestrator.computeHighestLevel()).toBe(0)
    expect(orchestrator.getCount()).toBe(0)
  })

  it('protects against race conditions and stale completions using generation tokens', () => {
    const orchestrator = new LoadingOrchestrator()

    // First attempt starts (generation 1)
    orchestrator.registerOperation({ dedupeKey: 'nav:route', generation: 1 })

    // Rapid successive navigation starts (generation 2)
    orchestrator.registerOperation({ dedupeKey: 'nav:route', generation: 2 })

    // Stale completion arrives for generation 1 -> must be ignored!
    const staleResult = orchestrator.unregisterOperation('nav:route', 1)
    expect(staleResult).toBe(false)
    expect(orchestrator.getCount()).toBe(1)
    expect(orchestrator.getOperation('nav:route')?.generation).toBe(2)

    // Correct completion arrives for generation 2 -> must succeed
    const validResult = orchestrator.unregisterOperation('nav:route', 2)
    expect(validResult).toBe(true)
    expect(orchestrator.getCount()).toBe(0)
  })

  it('safety timer isolation: decayStaleNavigation removes only navigation operations and NEVER touches other types', () => {
    const orchestrator = new LoadingOrchestrator()

    // Register a critical fetch or action operation
    const actionOp = orchestrator.registerOperation({
      id: 'action:custom-submission',
      type: 'action',
      level: 2,
    })

    // Register a navigation operation
    const navOp = orchestrator.registerOperation({
      id: 'nav:stale',
      type: 'navigation',
      level: 1,
    })

    expect(orchestrator.getCount()).toBe(2)

    // Attempting to decay the action operation via decayStaleNavigation must be rejected
    const decayedAction = orchestrator.decayStaleNavigation(actionOp.id)
    expect(decayedAction).toBe(false)
    expect(orchestrator.getOperation(actionOp.id)).toBeDefined()

    // Attempting to decay navigation operation succeeds
    const decayedNav = orchestrator.decayStaleNavigation(navOp.id)
    expect(decayedNav).toBe(true)
    expect(orchestrator.getOperation(navOp.id)).toBeUndefined()

    // The action operation is STILL alive and untouched!
    expect(orchestrator.getCount()).toBe(1)
    expect(orchestrator.getOperation(actionOp.id)).toBeDefined()
  })

  it('provides immutable snapshot of aggregated state', () => {
    const orchestrator = new LoadingOrchestrator()
    orchestrator.registerOperation({ id: 'op1', level: 2, type: 'fetch' })

    const snapshot = orchestrator.getSnapshot('revealed')
    expect(snapshot.isActive).toBe(true)
    expect(snapshot.phase).toBe('revealed')
    expect(snapshot.highestLevel).toBe(2)
    expect(snapshot.operationsCount).toBe(1)
    expect(snapshot.isProlonged).toBe(false)

    // Verify snapshot cannot mutate internal state
    expect(() => {
      ;(snapshot as any).isActive = false
    }).toThrow()
  })
})
