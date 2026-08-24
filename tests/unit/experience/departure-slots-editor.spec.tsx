// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { DepartureSlotsEditor } from '@/components/admin/DepartureSlotsEditor'
import { useDocumentInfo, useField } from '@payloadcms/ui'
import * as slotActions from '@/application/actions/slot-management-actions'

// Mock payload hooks
vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: vi.fn(),
  useField: vi.fn(() => ({
    setValue: vi.fn(),
  })),
}))

vi.mock('@/application/actions/slot-management-actions', () => ({
  getExperienceSlotsWithSummaryAction: vi.fn(),
  createDepartureSlotDirectAction: vi.fn(),
  updateDepartureSlotDirectAction: vi.fn(),
  cancelDepartureSlotDirectAction: vi.fn(),
}))

describe('DepartureSlotsEditor key-remounting & fetch cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(slotActions.getExperienceSlotsWithSummaryAction).mockImplementation(async (expId: number) => {
      if (expId === 10) {
        return {
          success: true,
          slots: [
            {
              id: 101,
              departureId: 'DEP-A',
              experienceId: 10,
              date: '2026-10-01',
              startTime: '09:00',
              effectivePrice: 1500,
              capacityTotal: 10,
              capacityReserved: 0,
              capacitySold: 0,
              capacityAvailable: 10,
              version: 1,
              status: 'available' as const,
              lifecycleStatus: 'upcoming' as const,
              isBookable: true,
              formattedTime: '9:00 AM',
            },
          ],
          summary: {
            upcomingCount: 1,
            startedCount: 0,
            completedCount: 0,
            cancelledCount: 0,
            corruptedCount: 0,
            totalCount: 1,
            totalAvailableSeats: 10,
            totalSoldSeats: 0,
            totalReservedSeats: 0,
          },
        }
      }
      if (expId === 20) {
        return {
          success: true,
          slots: [
            {
              id: 201,
              departureId: 'DEP-B',
              experienceId: 20,
              date: '2026-10-02',
              startTime: '10:00',
              effectivePrice: 2000,
              capacityTotal: 20,
              capacityReserved: 0,
              capacitySold: 0,
              capacityAvailable: 20,
              version: 1,
              status: 'available' as const,
              lifecycleStatus: 'upcoming' as const,
              isBookable: true,
              formattedTime: '10:00 AM',
            },
          ],
          summary: {
            upcomingCount: 1,
            startedCount: 0,
            completedCount: 0,
            cancelledCount: 0,
            corruptedCount: 0,
            totalCount: 1,
            totalAvailableSeats: 20,
            totalSoldSeats: 0,
            totalReservedSeats: 0,
          },
        }
      }
      return { success: false, error: 'Not found' }
    })
  })

  it('should clean remount when transitioning to experience B, ensuring no state leakage', async () => {
    // 1. Render for Experience 10
    ;(useDocumentInfo as any).mockReturnValue({ id: 10 })
    const { rerender, queryByText } = render(<DepartureSlotsEditor id={10} />)

    await waitFor(() => {
      expect(queryByText(/DEP-A/)).not.toBeNull()
    })

    expect(slotActions.getExperienceSlotsWithSummaryAction).toHaveBeenCalledWith(10)

    // 2. Transition to Experience 20
    ;(useDocumentInfo as any).mockReturnValue({ id: 20 })

    await act(async () => {
      rerender(<DepartureSlotsEditor id={20} />)
    })

    await waitFor(() => {
      expect(queryByText(/DEP-B/)).not.toBeNull()
    })

    expect(slotActions.getExperienceSlotsWithSummaryAction).toHaveBeenCalledWith(20)
    // Slot A must NEVER be rendered when viewing Experience 20
    expect(queryByText(/DEP-A/)).toBeNull()
  })
})
