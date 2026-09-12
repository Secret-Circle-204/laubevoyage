// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import { LoadingProvider, useGlobalLoading } from '@/providers/loading-provider'
import { useLoadingNavigation } from '@/application/loading/use-loading-navigation'
import { RouteProgressBar } from '@/components/ui/loading/RouteProgressBar'

// Mock next/navigation useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/experiences',
  useSearchParams: () => new URLSearchParams(),
}))

describe('useLoadingNavigation Hook & Rapid Navigation Specs', () => {
  beforeEach(() => {
    mockPush.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  function TestHarness({
    onReady,
  }: {
    onReady: (helpers: {
      nav: ReturnType<typeof useLoadingNavigation>
      loading: ReturnType<typeof useGlobalLoading>
    }) => void
  }) {
    const nav = useLoadingNavigation()
    const loading = useGlobalLoading()

    React.useEffect(() => {
      onReady({ nav, loading })
    }, [nav, loading, onReady])

    return <RouteProgressBar />
  }

  it('calls router.push with exact URL and options and registers operation with correct dedupeKey, type, and level', () => {
    let captured!: {
      nav: ReturnType<typeof useLoadingNavigation>
      loading: ReturnType<typeof useGlobalLoading>
    }

    render(
      <LoadingProvider>
        <TestHarness onReady={(h) => { captured = h }} />
      </LoadingProvider>
    )

    act(() => {
      captured.nav.push('/experiences?q=nile', { scroll: false })
    })

    // 1. Original router.push called with exact arguments
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/experiences?q=nile', { scroll: false })

    // 2. Loading operation registered with required contracts
    const state = captured.loading.state
    expect(state.isActive).toBe(true)
    expect(state.operationsCount).toBe(1)

    const op = state.activeOperations[0]
    expect(op.dedupeKey).toBe('nav:route')
    expect(op.type).toBe('navigation')
    expect(op.level).toBe(1)
    expect(op.metadata?.programmatic).toBe(true)
    expect(op.metadata?.targetUrl).toBe('/experiences?q=nile')
  })

  it('rapid navigation sequence (Filter A -> Filter B -> Reset) does NOT stack duplicate operations or leak stale operations', () => {
    let captured!: {
      nav: ReturnType<typeof useLoadingNavigation>
      loading: ReturnType<typeof useGlobalLoading>
    }

    const { queryByTestId, getByTestId } = render(
      <LoadingProvider>
        <TestHarness onReady={(h) => { captured = h }} />
      </LoadingProvider>
    )

    // User rapidly clicks Filter A
    act(() => {
      captured.nav.push('/experiences?countryId=1')
    })

    // User rapidly clicks Filter B 50ms later
    act(() => {
      vi.advanceTimersByTime(50)
      captured.nav.push('/experiences?countryId=1&cityId=2')
    })

    // User rapidly clicks Reset all filters 50ms later
    act(() => {
      vi.advanceTimersByTime(50)
      captured.nav.push('/experiences')
    })

    // Assert operations are deduplicated under nav:route (count is exactly 1, NOT 3)
    expect(captured.loading.state.operationsCount).toBe(1)
    const activeOp = captured.loading.state.activeOperations[0]
    expect(activeOp.metadata?.targetUrl).toBe('/experiences')

    // At 160ms total elapsed time, the reveal threshold (150ms) triggers for the active operation
    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(getByTestId('route-progress-bar')).toBeDefined()

    // Route commits to final destination (/experiences) -> Navigation completes
    act(() => {
      captured.loading.stop('nav:route')
    })

    // Advance through minVisibleDuration (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Progress bar cleanly finishes and resets to idle (NOT stuck)
    expect(queryByTestId('route-progress-bar')).toBeNull()
    expect(captured.loading.state.phase).toBe('idle')
    expect(captured.loading.state.isActive).toBe(false)
    expect(captured.loading.state.operationsCount).toBe(0)
  })

  it('preserves local/contextual operations independently without collision', () => {
    let captured!: {
      nav: ReturnType<typeof useLoadingNavigation>
      loading: ReturnType<typeof useGlobalLoading>
    }

    render(
      <LoadingProvider>
        <TestHarness onReady={(h) => { captured = h }} />
      </LoadingProvider>
    )

    // Start a custom/local operation (e.g. background data refresh)
    let localOpId!: string
    act(() => {
      localOpId = captured.loading.start({ type: 'fetch', level: 2, id: 'local-refresh' })
    })

    // Now trigger programmatic search navigation
    act(() => {
      captured.nav.push('/search?q=cairo')
    })

    // Both operations exist concurrently without interference
    expect(captured.loading.state.operationsCount).toBe(2)
    expect(captured.loading.state.highestLevel).toBe(2)

    // Stopping navigation leaves the local operation intact
    act(() => {
      captured.loading.stop('nav:route')
    })

    expect(captured.loading.state.operationsCount).toBe(1)
    expect(captured.loading.state.activeOperations[0].id).toBe(localOpId)

    // Cleanup local operation
    act(() => {
      captured.loading.stop(localOpId)
    })
    expect(captured.loading.state.operationsCount).toBe(0)
  })
})
