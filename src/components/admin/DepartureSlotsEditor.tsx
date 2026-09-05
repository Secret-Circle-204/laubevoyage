'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import {
  getExperienceSlotsWithSummaryAction,
  getHistoricalExperienceSlotsAction,
  createDepartureSlotDirectAction,
  updateDepartureSlotDirectAction,
  cancelDepartureSlotDirectAction,
  deleteDepartureSlotDirectAction,
  getDepartureSlotRelatedBookingsAction,
  type AdminDepartureSlotDTO,
  type AdminRelatedBookingDTO,
  type DepartureSlotsSummaryDTO,
} from '@/application/actions/slot-management-actions'

import {
  DepartureSlotsSummary,
  DepartureSlotsAddForm,
  DepartureSlotsEditForm,
  DepartureSlotsTabs,
  DepartureSlotsTable,
  RelatedBookingsModal,
  type NewSlotFormState,
  type EditSlotFormState,
  type DepartureSlotsTab,
} from './DepartureSlotsEditor/index'

import './DepartureSlotsEditor.css'

function DepartureSlotsEditorInner({ id }: { id?: string | number }) {
  // State: Slots data & loading
  const [slots, setSlots] = useState<AdminDepartureSlotDTO[]>([])
  const [serverSummary, setServerSummary] = useState<DepartureSlotsSummaryDTO>({
    upcomingCount: 0,
    startedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    corruptedCount: 0,
    totalCount: 0,
    totalAvailableSeats: 0,
    totalSoldSeats: 0,
    totalReservedSeats: 0,
  })
  const [loading, setLoading] = useState<boolean>(!!id)
  const [errorAlert, setErrorAlert] = useState<string | null>(null)
  const [successAlert, setSuccessAlert] = useState<string | null>(null)

  // State: Tab filtering (Default is 'upcoming' - bounded operational view)
  const [activeTab, setActiveTab] = useState<DepartureSlotsTab>('upcoming')

  // State: On-demand historical pagination
  const [historicalSlots, setHistoricalSlots] = useState<AdminDepartureSlotDTO[]>([])
  const [historicalPagination, setHistoricalPagination] = useState<{
    totalDocs: number
    limit: number
    totalPages: number
    page: number
    hasPrevPage: boolean
    hasNextPage: boolean
  } | null>(null)
  const [historicalPage, setHistoricalPage] = useState<number>(1)
  const [loadingHistorical, setLoadingHistorical] = useState<boolean>(false)

  // State: Add form toggle & form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [submittingAdd, setSubmittingAdd] = useState(false)
  const [newSlot, setNewSlot] = useState<NewSlotFormState>({
    date: '',
    startTime: '',
    priceOverrideEGP: '',
    capacityTotal: '',
    status: 'available',
  })

  // State: Edit form
  const [editingSlot, setEditingSlot] = useState<EditSlotFormState | null>(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // State: Cancelling / Deleting slot ID
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // State: On-demand Related Bookings Modal
  const [viewingBookingsSlot, setViewingBookingsSlot] = useState<AdminDepartureSlotDTO | null>(null)
  const [relatedBookings, setRelatedBookings] = useState<AdminRelatedBookingDTO[]>([])
  const [relatedPagination, setRelatedPagination] = useState<{
    totalDocs: number
    limit: number
    totalPages: number
    page: number
    hasPrevPage: boolean
    hasNextPage: boolean
  } | null>(null)
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false)
  const [bookingsPage, setBookingsPage] = useState<number>(1)

  // ─── Operational Fetch (Bounded Candidate Set) ────────────────────
  const fetchSlots = useCallback(async (): Promise<void> => {
    if (!id) return

    try {
      setLoading(true)
      const res = await getExperienceSlotsWithSummaryAction(Number(id))
      if (res.success && res.slots && res.summary) {
        setSlots(res.slots)
        setServerSummary(res.summary)
        setErrorAlert(null)
      } else {
        setErrorAlert(res.error || 'Failed to load departure slots from server.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Network error while loading departure slots.')
    } finally {
      setLoading(false)
    }
  }, [id])

  // ─── Historical On-Demand Fetch (Paginated from Server) ───────────
  const fetchHistoricalSlots = useCallback(
    async (scope: 'completed' | 'cancelled' | 'all', page = 1) => {
      if (!id) return
      try {
        setLoadingHistorical(true)
        const res = await getHistoricalExperienceSlotsAction(Number(id), {
          scope,
          page,
          limit: 20,
        })
        if (res.success && res.slots && res.pagination) {
          setHistoricalSlots(res.slots)
          setHistoricalPagination(res.pagination)
        } else {
          setErrorAlert(res.error || 'Failed to load historical departure slots.')
        }
      } catch (err: any) {
        setErrorAlert(err?.message || 'Network error while loading historical departure slots.')
      } finally {
        setLoadingHistorical(false)
      }
    },
    [id],
  )

  useEffect(() => {
    if (!id) return
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        void fetchSlots()
      }
    })
    return () => {
      active = false
    }
  }, [id, fetchSlots])

  useEffect(() => {
    if (activeTab === 'completed' || activeTab === 'cancelled' || activeTab === 'all') {
      let active = true
      Promise.resolve().then(() => {
        if (active) {
          void fetchHistoricalSlots(activeTab, historicalPage)
        }
      })
      return () => {
        active = false
      }
    }
  }, [activeTab, historicalPage, fetchHistoricalSlots])

  const handleTabChange = (newTab: DepartureSlotsTab) => {
    setActiveTab(newTab)
    setHistoricalPage(1)
  }

  // ─── Authoritative Summary & Filtering via Server DTO ─────────────
  const summary: DepartureSlotsSummaryDTO = serverSummary
  const isHistorical = activeTab === 'completed' || activeTab === 'cancelled' || activeTab === 'all'

  const filteredSlots = useMemo(() => {
    if (isHistorical) {
      return historicalSlots
    }
    switch (activeTab) {
      case 'upcoming':
        return slots.filter((s) => s.lifecycleStatus === 'upcoming')
      case 'started':
        return slots.filter((s) => s.lifecycleStatus === 'started')
      case 'corrupted_invariant':
        return slots.filter((s) => s.isCorrupted === true)
      default:
        return slots
    }
  }, [slots, historicalSlots, activeTab, isHistorical])

  // ─── Handlers: Add Slot ───────────────────────────────────────────
  const handleAddSlot = async () => {
    if (!id) return
    if (!newSlot.date) {
      setErrorAlert('Slot date is required.')
      return
    }
    const cap = Number(newSlot.capacityTotal)
    if (isNaN(cap) || cap < 1 || !Number.isInteger(cap)) {
      setErrorAlert('Capacity Total must be a positive whole number >= 1.')
      return
    }

    setSubmittingAdd(true)
    setErrorAlert(null)
    setSuccessAlert(null)

    try {
      const priceOverride = newSlot.priceOverrideEGP.trim()
        ? Number(newSlot.priceOverrideEGP)
        : undefined
      const res = await createDepartureSlotDirectAction({
        experienceId: Number(id),
        date: newSlot.date,
        startTime: newSlot.startTime.trim() || undefined,
        priceOverrideEGP: priceOverride,
        capacityTotal: cap,
        status: newSlot.status,
      })

      if (res.success && res.slot) {
        setSuccessAlert(`Departure slot #${res.slot.departureId} created successfully.`)
        setNewSlot({
          date: '',
          startTime: '',
          priceOverrideEGP: '',
          capacityTotal: '',
          status: 'available',
        })
        setShowAddForm(false)
        await fetchSlots()
      } else {
        setErrorAlert(res.error || 'Failed to create departure slot.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while creating departure slot.')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // ─── Handlers: Edit Slot ──────────────────────────────────────────
  const startEdit = (slot: AdminDepartureSlotDTO) => {
    setEditingSlot({
      slotId: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      priceOverrideEGP: slot.priceOverrideEGP !== undefined ? String(slot.priceOverrideEGP) : '',
      capacityTotal: String(slot.capacityTotal),
      status: slot.status,
      version: slot.version,
      reserved: slot.capacityReserved,
      sold: slot.capacitySold,
    })
    setErrorAlert(null)
    setSuccessAlert(null)
  }

  const cancelEdit = () => {
    setEditingSlot(null)
  }

  const handleSaveEdit = async () => {
    if (!editingSlot) return
    const cap = Number(editingSlot.capacityTotal)
    if (isNaN(cap) || cap < 1 || !Number.isInteger(cap)) {
      setErrorAlert('Capacity Total must be a positive whole number >= 1.')
      return
    }
    const minRequired = editingSlot.reserved + editingSlot.sold
    if (cap < minRequired) {
      setErrorAlert(`Cannot set capacity (${cap}) below reserved + sold seats (${minRequired}).`)
      return
    }

    setSubmittingEdit(true)
    setErrorAlert(null)
    setSuccessAlert(null)

    try {
      const priceOverride = editingSlot.priceOverrideEGP.trim()
        ? Number(editingSlot.priceOverrideEGP)
        : null
      const res = await updateDepartureSlotDirectAction({
        slotId: editingSlot.slotId,
        date: editingSlot.date,
        startTime: editingSlot.startTime.trim() || undefined,
        priceOverrideEGP: priceOverride,
        capacityTotal: cap,
        status: editingSlot.status,
        version: editingSlot.version,
      })

      if (res.success && res.slot) {
        setSuccessAlert(`Departure slot #${res.slot.departureId} updated successfully.`)
        setEditingSlot(null)
        await fetchSlots()
      } else {
        setErrorAlert(res.error || 'Failed to update departure slot.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while updating departure slot.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // ─── Handlers: Related Bookings (On-Demand) ──────────────────────
  const openRelatedBookings = async (slot: AdminDepartureSlotDTO, page = 1) => {
    setViewingBookingsSlot(slot)
    setBookingsPage(page)
    setLoadingBookings(true)
    try {
      const res = await getDepartureSlotRelatedBookingsAction(slot.id, { page, limit: 10 })
      if (res.success && res.bookings) {
        setRelatedBookings(res.bookings)
        setRelatedPagination(res.pagination || null)
      } else {
        setErrorAlert(res.error || 'Failed to load related bookings.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while loading related bookings.')
    } finally {
      setLoadingBookings(false)
    }
  }

  const closeRelatedBookings = () => {
    setViewingBookingsSlot(null)
    setRelatedBookings([])
    setRelatedPagination(null)
  }

  // ─── Handlers: Cancel Slot ────────────────────────────────────────
  const handleCancelSlot = async (slot: AdminDepartureSlotDTO) => {
    const bookingsCount = slot.referencedBookingsCount || 0
    const confirmMessage =
      bookingsCount > 0
        ? `⚠️ This departure has ${bookingsCount} existing booking(s).\n\nCancelling the departure will disable this slot from future public availability.\n\nExisting bookings will NOT be modified, cancelled, or refunded automatically. They will remain linked to this departure for administrative review.\n\nAre you sure you want to cancel this departure slot?`
        : `Are you sure you want to cancel departure slot on ${slot.date}? This will disable future public bookings.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setCancellingId(slot.id)
    setErrorAlert(null)
    setSuccessAlert(null)

    try {
      const res = await cancelDepartureSlotDirectAction({
        slotId: slot.id,
        version: slot.version,
      })

      if (res.success) {
        setSuccessAlert(`Departure slot #${slot.departureId} cancelled successfully.`)
        if (isHistorical) {
          await fetchHistoricalSlots(activeTab as any, historicalPage)
        } else {
          await fetchSlots()
        }
      } else {
        setErrorAlert(res.error || 'Failed to cancel departure slot.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while cancelling departure slot.')
    } finally {
      setCancellingId(null)
    }
  }

  // ─── Handlers: Delete Slot (Permanent Safe Removal) ───────────────
  const handleDeleteSlot = async (slot: AdminDepartureSlotDTO) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete departure slot on ${slot.date} (${slot.departureId})? This action is irreversible.`,
      )
    ) {
      return
    }

    setDeletingId(slot.id)
    setErrorAlert(null)
    setSuccessAlert(null)

    try {
      const res = await deleteDepartureSlotDirectAction({
        slotId: slot.id,
        version: slot.version,
      })

      if (res.success) {
        setSuccessAlert(`Departure slot #${slot.departureId} permanently deleted.`)
        if (isHistorical) {
          await fetchHistoricalSlots(activeTab as any, historicalPage)
        } else {
          await fetchSlots()
        }
      } else {
        setErrorAlert(res.error || 'Failed to delete departure slot.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while deleting departure slot.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('T')[0].split('-').map(Number)
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2])
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  // If experience is not saved yet (no ID)
  if (!id) {
    return (
      <div className="dse-container">
        <div className="dse-header">
          <div className="dse-title-area">
            <h4 className="dse-title">📅 Departure Slots Control Surface</h4>
            <p className="dse-description">
              Please save this experience first before configuring and managing departure slots.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dse-container">
      {/* Header */}
      <div className="dse-header">
        <div className="dse-title-area">
          <h4 className="dse-title">
            <span>📅 Departure Slots Control Surface</span>
          </h4>
          <p className="dse-description">
            Authoritative Single Source of Truth management for{' '}
            <strong>Experience #{String(id)}</strong>.
          </p>
        </div>
        <button
          type="button"
          className="dse-btn dse-btn--primary"
          onClick={() => {
            setShowAddForm((prev) => !prev)
            setEditingSlot(null)
          }}
        >
          {showAddForm ? '✕ Close Add Form' : '+ Add Departure Slot'}
        </button>
      </div>

      {/* Summary Metrics */}
      <DepartureSlotsSummary summary={summary} />

      {/* Alerts */}
      {errorAlert && (
        <div className="dse-alert dse-alert--error">
          <span>⚠️ {errorAlert}</span>
          <button
            type="button"
            className="dse-btn dse-btn--secondary"
            onClick={() => setErrorAlert(null)}
          >
            ✕
          </button>
        </div>
      )}
      {successAlert && (
        <div className="dse-alert dse-alert--success">
          <span>✓ {successAlert}</span>
          <button
            type="button"
            className="dse-btn dse-btn--secondary"
            onClick={() => setSuccessAlert(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Slot Form */}
      <DepartureSlotsAddForm
        show={showAddForm}
        submitting={submittingAdd}
        newSlot={newSlot}
        setNewSlot={setNewSlot}
        onAdd={handleAddSlot}
        onClose={() => setShowAddForm(false)}
      />

      {/* Edit Slot Form (when active) */}
      <DepartureSlotsEditForm
        editingSlot={editingSlot}
        submitting={submittingEdit}
        setEditingSlot={setEditingSlot}
        onSave={handleSaveEdit}
        onCancel={cancelEdit}
      />

      {/* Filter Tabs & Refresh */}
      <DepartureSlotsTabs
        activeTab={activeTab}
        summary={summary}
        loading={loading}
        loadingHistorical={loadingHistorical}
        onTabChange={handleTabChange}
        onRefresh={() => {
          if (isHistorical) {
            void fetchHistoricalSlots(activeTab as any, historicalPage)
          } else {
            void fetchSlots()
          }
        }}
      />

      {/* Loading state */}
      {(loading || loadingHistorical) && (
        <div
          className="dse-loading"
          style={{ padding: '16px', textAlign: 'center', color: '#a0aec0' }}
        >
          {loadingHistorical
            ? 'Loading historical departure slots from database...'
            : 'Loading departure slots from database...'}
        </div>
      )}

      {/* Data Table */}
      {!loading && !loadingHistorical && filteredSlots.length > 0 && (
        <>
          <DepartureSlotsTable
            slots={filteredSlots}
            editingSlotId={editingSlot?.slotId}
            cancellingId={cancellingId}
            deletingId={deletingId}
            onStartEdit={startEdit}
            onCancelSlot={handleCancelSlot}
            onDeleteSlot={handleDeleteSlot}
            onOpenBookings={(slot: AdminDepartureSlotDTO) => openRelatedBookings(slot, 1)}
            formatDate={formatDate}
          />

          {/* Real Server-Side Pagination for Historical Tabs */}
          {isHistorical && historicalPagination && historicalPagination.totalPages > 1 && (
            <div className="dse-pagination">
              <span className="dse-pagination-info">
                Showing page <strong>{historicalPagination.page}</strong> of{' '}
                <strong>{historicalPagination.totalPages}</strong> ({historicalPagination.totalDocs}{' '}
                total records)
              </span>
              <div className="dse-pagination-actions">
                <button
                  type="button"
                  className="dse-btn dse-btn--secondary"
                  disabled={!historicalPagination.hasPrevPage || loadingHistorical}
                  onClick={() => setHistoricalPage((prev) => Math.max(1, prev - 1))}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="dse-btn dse-btn--secondary"
                  disabled={!historicalPagination.hasNextPage || loadingHistorical}
                  onClick={() => setHistoricalPage((prev) => prev + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !loadingHistorical && filteredSlots.length === 0 && (
        <div className="dse-empty">
          {activeTab === 'all'
            ? 'No departure slots configured for this experience yet. Click "+ Add Departure Slot" to create the first slot.'
            : `No departure slots found under "${activeTab}" filter.`}
        </div>
      )}

      {/* Related Bookings Modal */}
      <RelatedBookingsModal
        slot={viewingBookingsSlot}
        bookings={relatedBookings}
        pagination={relatedPagination}
        loading={loadingBookings}
        currentPage={bookingsPage}
        onPageChange={openRelatedBookings}
        onClose={closeRelatedBookings}
      />
    </div>
  )
}

export const DepartureSlotsEditor: React.FC<Record<string, unknown>> = (props) => {
  const docInfo = useDocumentInfo()
  const id = (props as { id?: string | number })?.id || docInfo?.id

  return <DepartureSlotsEditorInner key={id || 'new'} id={id} />
}
