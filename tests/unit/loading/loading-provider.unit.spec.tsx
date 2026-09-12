// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import { LoadingProvider, useGlobalLoading } from '@/providers/loading-provider'

describe('LoadingProvider Lifecycle & Timing Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  function TestConsumer({ onMount }: { onMount?: (api: ReturnType<typeof useGlobalLoading>) => void }) {
    const api = useGlobalLoading()
    React.useEffect(() => {
      onMount?.(api)
    }, [api, onMount])

    return (
      <div>
        <span data-testid="phase">{api.state.phase}</span>
        <span data-testid="is-active">{String(api.state.isActive)}</span>
        <span data-testid="level">{api.state.highestLevel}</span>
        <span data-testid="count">{api.state.operationsCount}</span>
        <span data-testid="is-prolonged">{String(api.state.isProlonged)}</span>
      </div>
    )
  }

  it('renders initial state deterministically for SSR safety', () => {
    const { getByTestId } = render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    )

    expect(getByTestId('phase').textContent).toBe('idle')
    expect(getByTestId('is-active').textContent).toBe('false')
    expect(getByTestId('level').textContent).toBe('0')
    expect(getByTestId('count').textContent).toBe('0')
  })

  it('fast operation (<150ms) stays silent and never displays (Zero Flicker)', () => {
    let loadingApi!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestConsumer onMount={(api) => { loadingApi = api }} />
      </LoadingProvider>
    )

    // Start an operation
    let opId!: string
    act(() => {
      opId = loadingApi.start({ type: 'fetch', level: 2 })
    })

    // At 50ms, phase is 'silent' (no UI indicator)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(getByTestId('phase').textContent).toBe('silent')
    expect(getByTestId('is-active').textContent).toBe('true')

    // Operation completes at 80ms
    act(() => {
      loadingApi.stop(opId)
    })

    // Immediately transitions back to idle with zero visible reveal
    expect(getByTestId('phase').textContent).toBe('idle')
    expect(getByTestId('is-active').textContent).toBe('false')
  })

  it('operation exceeding revealDelay (150ms) transitions to revealed', () => {
    let loadingApi!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestConsumer onMount={(api) => { loadingApi = api }} />
      </LoadingProvider>
    )

    act(() => {
      loadingApi.start({ type: 'navigation', level: 1 })
    })

    // At 151ms, reveal timer fires
    act(() => {
      vi.advanceTimersByTime(151)
    })

    expect(getByTestId('phase').textContent).toBe('revealed')
    expect(getByTestId('level').textContent).toBe('1')
  })

  it('enforces minVisibleDurationMs (300ms) after reveal before transitioning to idle', () => {
    let loadingApi!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestConsumer onMount={(api) => { loadingApi = api }} />
      </LoadingProvider>
    )

    let opId!: string
    act(() => {
      opId = loadingApi.start({ type: 'fetch', level: 2 })
    })

    // Advance to reveal (150ms)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(getByTestId('phase').textContent).toBe('revealed')

    // Operation stops at 180ms (30ms after reveal)
    act(() => {
      vi.advanceTimersByTime(30)
      loadingApi.stop(opId)
    })

    // Must STILL be revealed because 300ms minimum visible duration has not elapsed!
    expect(getByTestId('phase').textContent).toBe('revealed')

    // Advance by remaining 270ms
    act(() => {
      vi.advanceTimersByTime(270)
    })

    // Now cleanly idle
    expect(getByTestId('phase').textContent).toBe('idle')
    expect(getByTestId('is-active').textContent).toBe('false')
  })

  it('escalates to prolonged state after longOperationThresholdMs (2500ms)', () => {
    let loadingApi!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestConsumer onMount={(api) => { loadingApi = api }} />
      </LoadingProvider>
    )

    act(() => {
      loadingApi.start({ type: 'fetch', level: 3 })
    })

    // Advance to 2500ms
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(getByTestId('phase').textContent).toBe('prolonged')
    expect(getByTestId('is-prolonged').textContent).toBe('true')
  })

  it('cleans up all timers on unmount without throwing or leaking', () => {
    let loadingApi!: ReturnType<typeof useGlobalLoading>

    const { unmount } = render(
      <LoadingProvider>
        <TestConsumer onMount={(api) => { loadingApi = api }} />
      </LoadingProvider>
    )

    act(() => {
      loadingApi.start({ type: 'navigation', level: 1 })
    })

    // Unmount while operation is active
    expect(() => {
      unmount()
    }).not.toThrow()

    // Advancing timers after unmount should not cause state update errors
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000)
      })
    }).not.toThrow()
  })
})
