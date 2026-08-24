// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { DepartureSlotsEditor } from '@/components/admin/DepartureSlotsEditor'
import * as slotActions from '@/application/actions/slot-management-actions'

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => ({
    id: 10,
  }),
}))

vi.mock('@/application/actions/slot-management-actions', () => ({
  getExperienceSlotsWithSummaryAction: vi.fn(),
  createDepartureSlotDirectAction: vi.fn(),
  updateDepartureSlotDirectAction: vi.fn(),
  cancelDepartureSlotDirectAction: vi.fn(),
}))

describe('BATCH 17F — DepartureSlotsEditor Control Surface Component Verification', () => {
  const mockSlots = [
    {
      id: 101,
      departureId: 'DEP-10-2026-11-01-0900',
      experienceId: 10,
      date: '2026-11-01',
      startTime: '09:00',
      priceOverrideEGP: 1500,
      effectivePrice: 1500,
      capacityTotal: 20,
      capacityReserved: 2,
      capacitySold: 4,
      capacityAvailable: 14,
      version: 1,
      status: 'available' as const,
      lifecycleStatus: 'upcoming' as const,
      isBookable: true,
      formattedTime: '9:00 AM',
      destinationTimezone: 'Africa/Cairo',
    },
    {
      id: 102,
      departureId: 'DEP-10-2026-08-01-0900',
      experienceId: 10,
      date: '2026-08-01',
      startTime: '09:00',
      priceOverrideEGP: undefined,
      effectivePrice: 2000,
      capacityTotal: 15,
      capacityReserved: 0,
      capacitySold: 15,
      capacityAvailable: 0,
      version: 2,
      status: 'sold_out' as const,
      lifecycleStatus: 'completed' as const,
      isBookable: false,
      formattedTime: '9:00 AM',
      destinationTimezone: 'Africa/Cairo',
    },
    {
      id: 103,
      departureId: 'DEP-10-2026-12-01-0900',
      experienceId: 10,
      date: '2026-12-01',
      startTime: '09:00',
      priceOverrideEGP: undefined,
      effectivePrice: 2000,
      capacityTotal: 20,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: 20,
      version: 1,
      status: 'cancelled' as const,
      lifecycleStatus: 'cancelled' as const,
      isBookable: false,
      formattedTime: '9:00 AM',
      destinationTimezone: 'Africa/Cairo',
    },
  ]

  const mockSummary = {
    upcomingCount: 1,
    startedCount: 0,
    completedCount: 1,
    cancelledCount: 1,
    corruptedCount: 0,
    totalCount: 3,
    totalAvailableSeats: 14,
    totalSoldSeats: 19,
    totalReservedSeats: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(slotActions.getExperienceSlotsWithSummaryAction).mockResolvedValue({
      success: true,
      experience: { id: 10, title: 'Cairo Experience', price: 2000 },
      slots: mockSlots,
      summary: mockSummary,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders summary metrics and authoritative slot table faithfully', async () => {
    render(<DepartureSlotsEditor />)

    await waitFor(() => {
      expect(screen.getByText(/Experience #10/i)).toBeDefined()
    })

    // Summary Metric Cards
    expect(screen.getByText('Upcoming Slots').nextElementSibling?.textContent).toBe('1')
    expect(screen.getByText('Available Seats').nextElementSibling?.textContent).toBe('14')
    expect(screen.getByText('Sold Tickets').nextElementSibling?.textContent).toBe('19')
    expect(screen.getByText('Reserved Holds').nextElementSibling?.textContent).toBe('2')

    // Slots Rows
    expect(screen.getByText('1,500 EGP')).toBeDefined()
    expect(screen.getByText('14 Available')).toBeDefined()
    expect(screen.getByText('Upcoming • Available')).toBeDefined()
    expect(screen.getByText('Completed')).toBeDefined()
    expect(screen.getByText('Cancelled')).toBeDefined()
  })

  it('filters slots by tab correctly', async () => {
    render(<DepartureSlotsEditor />)

    await waitFor(() => {
      expect(screen.getByText('All (3)')).toBeDefined()
    })

    // Click Cancelled tab
    const cancelledTab = screen.getByRole('button', { name: /Cancelled/i })
    fireEvent.click(cancelledTab)

    expect(screen.getByText(/DEP-10-2026-12-01-0900/i)).toBeDefined()
    expect(screen.queryByText(/DEP-10-2026-11-01-0900/i)).toBeNull()
  })

  it('opens edit form and preserves optimistic concurrency version', async () => {
    render(<DepartureSlotsEditor />)

    await waitFor(() => {
      expect(screen.getAllByText('Edit').length).toBeGreaterThan(0)
    })

    const editButton = screen.getAllByText('Edit')[0]
    fireEvent.click(editButton)

    expect(screen.getByText(/Edit Departure Slot #101/i)).toBeDefined()
    expect(screen.getByText(/Min Total: 6/i)).toBeDefined()
    expect(screen.getByText(/Capacity Available:/i)).toBeDefined()
  })
})
