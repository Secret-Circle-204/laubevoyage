'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import {
  getExperienceSlotsWithSummaryAction,
  createDepartureSlotDirectAction,
  updateDepartureSlotDirectAction,
  cancelDepartureSlotDirectAction,
  type AdminDepartureSlotDTO,
  type DepartureSlotsSummaryDTO,
} from '@/application/actions/slot-management-actions'

import './DepartureSlotsEditor.css'

interface NewSlotFormState {
  date: string
  startTime: string
  priceOverrideEGP: string
  capacityTotal: string
  status: DepartureSlotStatus
}

interface EditSlotFormState {
  slotId: number
  date: string
  startTime: string
  priceOverrideEGP: string
  capacityTotal: string
  status: DepartureSlotStatus
  version: number
  reserved: number
  sold: number
}

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

  // State: Tab filtering
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'started' | 'completed' | 'cancelled' | 'corrupted_invariant'>('all')

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

  // State: Cancelling slot ID
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  // ─── Single Fetch Function via Authoritative Server Action ────────
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

  // ─── Authoritative Summary & Filtering via Server DTO ─────────────
  const summary: DepartureSlotsSummaryDTO = serverSummary

  const filteredSlots = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return slots.filter((s) => s.lifecycleStatus === 'upcoming')
      case 'started':
        return slots.filter((s) => s.lifecycleStatus === 'started')
      case 'completed':
        return slots.filter((s) => s.lifecycleStatus === 'completed')
      case 'cancelled':
        return slots.filter((s) => s.lifecycleStatus === 'cancelled')
      case 'corrupted_invariant':
        return slots.filter((s) => s.isCorrupted === true)
      case 'all':
      default:
        return slots
    }
  }, [slots, activeTab])

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

  // ─── Handlers: Cancel Slot ────────────────────────────────────────
  const handleCancelSlot = async (slot: AdminDepartureSlotDTO) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel departure slot on ${slot.date}? This will prevent future bookings.`,
      )
    ) {
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
        await fetchSlots()
      } else {
        setErrorAlert(res.error || 'Failed to cancel departure slot.')
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Error occurred while cancelling departure slot.')
    } finally {
      setCancellingId(null)
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
      <div className="dse-summary-grid">
        <div className="dse-stat-card">
          <span className="dse-stat-label">Upcoming Slots</span>
          <span className="dse-stat-val dse-stat-val--upcoming">{summary.upcomingCount}</span>
        </div>
        <div className="dse-stat-card">
          <span className="dse-stat-label">Available Seats</span>
          <span className="dse-stat-val dse-stat-val--available">
            {summary.totalAvailableSeats}
          </span>
        </div>
        <div className="dse-stat-card">
          <span className="dse-stat-label">Sold Tickets</span>
          <span className="dse-stat-val dse-stat-val--sold">{summary.totalSoldSeats}</span>
        </div>
        <div className="dse-stat-card">
          <span className="dse-stat-label">Reserved Holds</span>
          <span className="dse-stat-val dse-stat-val--reserved">{summary.totalReservedSeats}</span>
        </div>
      </div>

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
      {showAddForm && (
        <div className="dse-form-panel">
          <h5 className="dse-form-title">Add New Departure Slot</h5>
          <div className="dse-form-grid">
            <div className="dse-form-group">
              <label className="dse-label">Date *</label>
              <input
                type="date"
                className="dse-input"
                value={newSlot.date}
                onChange={(e) => setNewSlot((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Start Time (HH:mm)</label>
              <input
                type="text"
                className="dse-input"
                placeholder="e.g. 09:00"
                value={newSlot.startTime}
                onChange={(e) => setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Price Override (EGP)</label>
              <input
                type="number"
                className="dse-input"
                placeholder="Inherits Experience.price"
                value={newSlot.priceOverrideEGP}
                min="0"
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, priceOverrideEGP: e.target.value }))
                }
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Capacity Total *</label>
              <input
                type="number"
                className="dse-input"
                placeholder="e.g. 20"
                value={newSlot.capacityTotal}
                min="1"
                onChange={(e) => setNewSlot((prev) => ({ ...prev, capacityTotal: e.target.value }))}
              />
              {newSlot.capacityTotal && !isNaN(Number(newSlot.capacityTotal)) && (
                <span className="dse-meta">
                  Capacity Available: <strong>{Math.max(0, Number(newSlot.capacityTotal))}</strong>{' '}
                  seats
                </span>
              )}
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Status</label>
              <select
                className="dse-select"
                value={newSlot.status}
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, status: e.target.value as DepartureSlotStatus }))
                }
              >
                <option value="available">Available</option>
                <option value="blacked_out">Blacked Out</option>
              </select>
            </div>
          </div>
          <div className="dse-form-actions">
            <button
              type="button"
              className="dse-btn dse-btn--save"
              disabled={submittingAdd || !newSlot.date || !newSlot.capacityTotal}
              onClick={handleAddSlot}
            >
              {submittingAdd ? 'Creating Slot...' : '✓ Create Departure Slot'}
            </button>
            <button
              type="button"
              className="dse-btn dse-btn--secondary"
              onClick={() => setShowAddForm(false)}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Edit Slot Form (when active) */}
      {editingSlot && (
        <div className="dse-form-panel">
          <h5 className="dse-form-title">
            Edit Departure Slot #{String(editingSlot.slotId)} (Version: v
            {String(editingSlot.version)})
          </h5>
          <div className="dse-form-grid">
            <div className="dse-form-group">
              <label className="dse-label">Date *</label>
              <input
                type="date"
                className="dse-input"
                value={editingSlot.date}
                onChange={(e) =>
                  setEditingSlot((prev) => (prev ? { ...prev, date: e.target.value } : null))
                }
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Start Time (HH:mm)</label>
              <input
                type="text"
                className="dse-input"
                value={editingSlot.startTime}
                onChange={(e) =>
                  setEditingSlot((prev) => (prev ? { ...prev, startTime: e.target.value } : null))
                }
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Price Override (EGP)</label>
              <input
                type="number"
                className="dse-input"
                placeholder="Inherits Experience.price"
                value={editingSlot.priceOverrideEGP}
                min="0"
                onChange={(e) =>
                  setEditingSlot((prev) =>
                    prev ? { ...prev, priceOverrideEGP: e.target.value } : null,
                  )
                }
              />
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Capacity Total *</label>
              <input
                type="number"
                className="dse-input"
                value={editingSlot.capacityTotal}
                min={editingSlot.reserved + editingSlot.sold}
                onChange={(e) =>
                  setEditingSlot((prev) =>
                    prev ? { ...prev, capacityTotal: e.target.value } : null,
                  )
                }
              />
              <span className="dse-meta">
                Capacity Available:{' '}
                <strong>
                  {Math.max(
                    0,
                    Number(editingSlot.capacityTotal || 0) -
                      editingSlot.reserved -
                      editingSlot.sold,
                  )}
                </strong>{' '}
                seats | Reserved: {String(editingSlot.reserved)} | Sold: {String(editingSlot.sold)}{' '}
                (Min Total: {String(editingSlot.reserved + editingSlot.sold)})
              </span>
            </div>
            <div className="dse-form-group">
              <label className="dse-label">Status</label>
              <select
                className="dse-select"
                value={editingSlot.status}
                onChange={(e) =>
                  setEditingSlot((prev) =>
                    prev ? { ...prev, status: e.target.value as DepartureSlotStatus } : null,
                  )
                }
              >
                <option value="available">Available</option>
                <option value="blacked_out">Blacked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="dse-form-actions">
            <button
              type="button"
              className="dse-btn dse-btn--save"
              disabled={submittingEdit || !editingSlot.date || !editingSlot.capacityTotal}
              onClick={handleSaveEdit}
            >
              {submittingEdit ? 'Saving Changes...' : '✓ Save Slot Updates'}
            </button>
            <button type="button" className="dse-btn dse-btn--secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="dse-controls">
        <div className="dse-tabs">
          <button
            type="button"
            className={`dse-tab ${activeTab === 'all' ? 'dse-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({summary.totalCount})
          </button>
          <button
            type="button"
            className={`dse-tab ${activeTab === 'upcoming' ? 'dse-tab--active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({summary.upcomingCount})
          </button>
          <button
            type="button"
            className={`dse-tab ${activeTab === 'started' ? 'dse-tab--active' : ''}`}
            onClick={() => setActiveTab('started')}
          >
            Started ({summary.startedCount})
          </button>
          <button
            type="button"
            className={`dse-tab ${activeTab === 'completed' ? 'dse-tab--active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({summary.completedCount})
          </button>
          <button
            type="button"
            className={`dse-tab ${activeTab === 'cancelled' ? 'dse-tab--active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled ({summary.cancelledCount})
          </button>
          {summary.corruptedCount > 0 && (
            <button
              type="button"
              className={`dse-tab ${activeTab === 'corrupted_invariant' ? 'dse-tab--active' : ''}`}
              style={{ color: '#ef4444', fontWeight: 600 }}
              onClick={() => setActiveTab('corrupted_invariant')}
            >
              ⚠️ Corrupted ({summary.corruptedCount})
            </button>
          )}
        </div>

        <button
          type="button"
          className="dse-btn dse-btn--secondary"
          onClick={() => fetchSlots()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Slots'}
        </button>
      </div>

      {/* Loading state */}
      {loading && <div className="dse-loading">Loading departure slots from database...</div>}

      {/* Data Table */}
      {!loading && filteredSlots.length > 0 && (
        <div className="dse-table-wrap">
          <table className="dse-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time & Timezone</th>
                <th>Price</th>
                <th>Total Cap</th>
                <th>Reserved</th>
                <th>Sold</th>
                <th>Capacity Available</th>
                <th>Lifecycle Status</th>
                <th>Version / ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.map((slot) => {
                const isCorrupted = !!slot.isCorrupted
                const isCancelled = slot.lifecycleStatus === 'cancelled' || slot.status === 'cancelled'
                const isStarted = slot.lifecycleStatus === 'started'
                const isCompleted = slot.lifecycleStatus === 'completed'
                const isEditing = editingSlot?.slotId === slot.id

                return (
                  <tr
                    key={slot.id}
                    className={`${isCorrupted ? 'dse-row--corrupted' : isCancelled ? 'dse-row--cancelled' : ''} ${isCompleted ? 'dse-row--past' : ''} ${isEditing ? 'dse-row--edit-active' : ''}`}
                    style={isCorrupted ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : undefined}
                  >
                    <td>
                      <strong>{formatDate(slot.date)}</strong>
                    </td>
                    <td>
                      <span>{slot.formattedTime || slot.startTime || '—'}</span>
                      {slot.destinationTimezone && (
                        <span className="dse-meta" style={{ display: 'block', fontSize: '10px' }}>
                          {slot.destinationTimezone}
                        </span>
                      )}
                    </td>
                    <td>
                      <span>
                        {slot.priceOverrideEGP !== undefined
                          ? `${slot.priceOverrideEGP.toLocaleString()} EGP`
                          : 'Base Price'}
                      </span>
                      {slot.priceOverrideEGP !== undefined && (
                        <span className="dse-tag dse-tag--override">Override</span>
                      )}
                    </td>
                    <td>{slot.capacityTotal}</td>
                    <td>{slot.capacityReserved}</td>
                    <td>{slot.capacitySold}</td>
                    <td>
                      <span
                        className={`dse-badge ${slot.capacityAvailable > 0 ? 'dse-badge--available' : 'dse-badge--sold_out'}`}
                      >
                        {slot.capacityAvailable} Available
                      </span>
                    </td>
                    <td>
                      {isCorrupted ? (
                        <span
                          className="dse-badge"
                          style={{ backgroundColor: '#ef4444', color: '#fff' }}
                          title={slot.corruptionReason}
                        >
                          Corrupted • Invalid
                        </span>
                      ) : isCancelled ? (
                        <span className="dse-badge dse-badge--cancelled">Cancelled</span>
                      ) : isStarted ? (
                        <span className="dse-badge dse-badge--override">Started</span>
                      ) : isCompleted ? (
                        <span className="dse-badge dse-badge--sold_out">Completed</span>
                      ) : slot.capacityAvailable > 0 ? (
                        <span className="dse-badge dse-badge--available">Upcoming • Available</span>
                      ) : (
                        <span className="dse-badge dse-badge--sold_out">Upcoming • Sold Out</span>
                      )}
                    </td>
                    <td>
                      <span className="dse-meta">
                        v{slot.version} • {slot.departureId}
                      </span>
                    </td>
                    <td>
                      <div className="dse-actions-cell">
                        <button
                          type="button"
                          className="dse-btn dse-btn--edit"
                          onClick={() => startEdit(slot)}
                          disabled={isCancelled}
                        >
                          Edit
                        </button>
                        <a
                          href={`/admin/collections/departure-slots/${slot.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="dse-btn dse-btn--open"
                        >
                          Open ↗
                        </a>
                        {!isCancelled && (
                          <button
                            type="button"
                            className="dse-btn dse-btn--cancel"
                            onClick={() => handleCancelSlot(slot)}
                            disabled={cancellingId === slot.id || slot.capacitySold > 0}
                            title={
                              slot.capacitySold > 0
                                ? 'Cannot cancel slot with sold tickets'
                                : 'Cancel departure slot'
                            }
                          >
                            {cancellingId === slot.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSlots.length === 0 && (
        <div className="dse-empty">
          {activeTab === 'all'
            ? 'No departure slots configured for this experience yet. Click "+ Add Departure Slot" to create the first slot.'
            : `No departure slots found under "${activeTab}" filter.`}
        </div>
      )}
    </div>
  )
}

export const DepartureSlotsEditor: React.FC<Record<string, unknown>> = (props) => {
  const docInfo = useDocumentInfo()
  const id = (props as { id?: string | number })?.id || docInfo?.id

  return <DepartureSlotsEditorInner key={id || 'new'} id={id} />
}
