// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { DepartureSlotsEditor } from '@/components/admin/DepartureSlotsEditor'
import { useDocumentInfo, useField } from '@payloadcms/ui'

// Mock payload hooks
vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: vi.fn(),
  useField: vi.fn(() => ({
    setValue: vi.fn(),
  })),
}))

describe('DepartureSlotsEditor key-remounting & fetch cancellation', () => {
  let mockFetch: any
  let resolveA: any
  let resolveB: any
  let signalA: AbortSignal | null = null
  let signalB: AbortSignal | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    signalA = null
    signalB = null

    mockFetch = vi.fn((url, options) => {
      console.log('mockFetch arguments:', url, options)
      return new Promise((resolve, reject) => {
        const signal = options?.signal
        const urlStr = typeof url === 'object' && url !== null && 'url' in url ? (url as any).url : String(url)
        console.log('Parsed urlStr:', urlStr)
        if (urlStr.includes('equals]=A')) {
          console.log('Entered A block, signal:', signal)
          signalA = signal
          resolveA = () => resolve({ json: async () => ({ docs: [{ id: 'slot-A', date: '2026-10-01T12:00:00', startTime: '09:00', capacityTotal: 10, status: 'available' }] }) })
        } else if (urlStr.includes('equals]=B')) {
          console.log('Entered B block, signal:', signal)
          signalB = signal
          resolveB = () => resolve({ json: async () => ({ docs: [{ id: 'slot-B', date: '2026-10-02T12:00:00', startTime: '10:00', capacityTotal: 20, status: 'available' }] }) })
        }
        
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The user aborted a request.', 'AbortError'))
          })
        }
      })
    })
    global.fetch = mockFetch
  })

  it('should abort in-flight fetch A when transitioning to experience B, ensuring no state leakage', async () => {
    // 1. Render for Experience A
    ;(useDocumentInfo as any).mockReturnValue({ id: 'A' })
    const { rerender, queryByText } = render(<DepartureSlotsEditor path="_slotsPayload" field={{} as any} />)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(signalA?.aborted).toBe(false)

    // 2. Transition to Experience B
    ;(useDocumentInfo as any).mockReturnValue({ id: 'B' })
    
    await act(async () => {
      rerender(<DepartureSlotsEditor path="_slotsPayload" field={{} as any} />)
    })

    // Assert that Fetch A is aborted
    expect(signalA?.aborted).toBe(true)

    // Assert that Fetch B is started and not aborted
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(signalB?.aborted).toBe(false)

    // 3. Resolve Fetch A (stale response)
    await act(async () => {
      resolveA()
    })

    // Resolve Fetch B (correct response)
    await act(async () => {
      resolveB()
    })

    // Because the component for A was unmounted and aborted, slot A must NEVER be rendered.
    expect(queryByText('01 Oct 2026')).toBeNull()
  })
})
