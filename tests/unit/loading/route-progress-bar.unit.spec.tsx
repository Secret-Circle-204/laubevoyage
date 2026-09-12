// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import { LoadingProvider, useGlobalLoading } from '@/providers/loading-provider'
import { RouteProgressBar } from '@/components/ui/loading/RouteProgressBar'

describe('RouteProgressBar Component Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  function TestHarness({
    onApiReady,
  }: {
    onApiReady: (api: ReturnType<typeof useGlobalLoading>) => void
  }) {
    const api = useGlobalLoading()
    React.useEffect(() => {
      onApiReady(api)
    }, [api, onApiReady])

    return <RouteProgressBar />
  }

  it('emits no DOM elements during idle state (zero layout shift)', () => {
    const { queryByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={() => {}} />
      </LoadingProvider>
    )

    expect(queryByTestId('route-progress-bar')).toBeNull()
  })

  it('stays silent and emits no DOM elements during silent phase (< 150ms)', () => {
    let api!: ReturnType<typeof useGlobalLoading>

    const { queryByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={(loadingApi) => { api = loadingApi }} />
      </LoadingProvider>
    )

    act(() => {
      api.start({ type: 'navigation', level: 1 })
    })

    // Advance 100ms (below revealDelayMs 150ms)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Still completely absent from the DOM
    expect(queryByTestId('route-progress-bar')).toBeNull()
  })

  it('renders fixed slim bar when navigation operation reveals (> 150ms)', () => {
    let api!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={(loadingApi) => { api = loadingApi }} />
      </LoadingProvider>
    )

    act(() => {
      api.start({ type: 'navigation', level: 1 })
    })

    // Advance to 160ms (triggers reveal)
    act(() => {
      vi.advanceTimersByTime(160)
    })

    const bar = getByTestId('route-progress-bar')
    expect(bar).toBeDefined()
    expect(bar.getAttribute('role')).toBe('progressbar')
    expect(bar.getAttribute('aria-hidden')).toBe('true')

    // Verify non-blocking layout invariants
    expect(bar.className).toContain('fixed')
    expect(bar.className).toContain('top-0')
    expect(bar.className).toContain('pointer-events-none')
    expect(bar.className).toContain('h-[2.5px]')

    // Verify fill styling, brand gradient, and RTL support
    const fill = getByTestId('route-progress-bar-fill')
    expect(fill.className).toContain('bg-gradient-to-r')
    expect(fill.className).toContain('rtl:bg-gradient-to-l')
    expect(fill.className).toContain('origin-left')
    expect(fill.className).toContain('rtl:origin-right')
    expect(fill.className).toContain('motion-reduce:transition-none')
  })

  it('does NOT render for non-navigation operations (e.g. background fetch)', () => {
    let api!: ReturnType<typeof useGlobalLoading>

    const { queryByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={(loadingApi) => { api = loadingApi }} />
      </LoadingProvider>
    )

    act(() => {
      api.start({ type: 'fetch', level: 2 })
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Scoped strictly to navigation: fetch does not trigger RouteProgressBar
    expect(queryByTestId('route-progress-bar')).toBeNull()
  })

  it('smoothly completes and resets to idle when navigation finishes', () => {
    let api!: ReturnType<typeof useGlobalLoading>

    const { queryByTestId, getByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={(loadingApi) => { api = loadingApi }} />
      </LoadingProvider>
    )

    let opId!: string
    act(() => {
      opId = api.start({ type: 'navigation', level: 1 })
    })

    // Reveal at 150ms
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(getByTestId('route-progress-bar')).toBeDefined()

    // Stop navigation operation at 200ms
    act(() => {
      vi.advanceTimersByTime(50)
      api.stop(opId)
    })

    // Advance through minVisibleDurationMs (remaining 250ms)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // After completion and fade out, unmounts from DOM
    expect(queryByTestId('route-progress-bar')).toBeNull()
  })

  it('does NOT create a fullscreen overlay or block clicks', () => {
    let api!: ReturnType<typeof useGlobalLoading>

    const { getByTestId } = render(
      <LoadingProvider>
        <TestHarness onApiReady={(loadingApi) => { api = loadingApi }} />
      </LoadingProvider>
    )

    act(() => {
      api.start({ type: 'navigation', level: 1 })
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    const bar = getByTestId('route-progress-bar')
    // Must NOT be full height (e.g., h-full or inset-0)
    expect(bar.className).not.toContain('h-full')
    expect(bar.className).not.toContain('inset-0')
    expect(bar.className).toContain('pointer-events-none')
  })
})
