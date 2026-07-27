'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useField, useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

import './DepartureSlotsEditor.css'

// ─── Types ──────────────────────────────────────────────────────────

interface ExistingSlot {
  id: string | number
  departureId: string
  date: string
  startTime: string
  basePriceEGP?: number
  capacityTotal: number
  capacityReserved: number
  capacitySold: number
  capacityAvailable: number
  status: string
}

interface PendingSlot {
  _tempId: string
  date: string
  startTime: string
  basePriceEGP: string
  capacityTotal: string
}

// ─── Component ──────────────────────────────────────────────────────

export const DepartureSlotsEditor: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo()
  const { setValue } = useField<object>({ path: '_slotsPayload' })

  // State: existing slots loaded from API (edit mode only)
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // State: new slots pending creation (in-memory only)
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([])

  // State: IDs of existing slots marked for cancellation
  const [cancelledSlotIds, setCancelledSlotIds] = useState<(string | number)[]>([])

  // State: inline add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSlot, setNewSlot] = useState<PendingSlot>({
    _tempId: '',
    date: '',
    startTime: '09:00',
    basePriceEGP: '',
    capacityTotal: '20',
  })

  // ─── Load existing slots in edit mode ───────────────────────────
  useEffect(() => {
    if (!id) return

    setLoadingSlots(true)
    fetch(`/api/departure-slots?where[experience][equals]=${id}&limit=100&sort=date`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.docs) {
          setExistingSlots(data.docs)
        }
      })
      .catch((err) => console.error('Failed to load departure slots:', err))
      .finally(() => setLoadingSlots(false))
  }, [id])

  // ─── Sync to virtual field on every state change ────────────────
  const syncToFormState = useCallback(() => {
    const payload = {
      newSlots: pendingSlots.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        basePriceEGP: s.basePriceEGP ? Number(s.basePriceEGP) : undefined,
        capacityTotal: s.capacityTotal ? Number(s.capacityTotal) : 20,
      })),
      cancelledSlotIds,
    }

    // Only set value if there's actual work to do
    if (payload.newSlots.length > 0 || payload.cancelledSlotIds.length > 0) {
      setValue(payload)
    } else {
      setValue(null)
    }
  }, [pendingSlots, cancelledSlotIds, setValue])

  useEffect(() => {
    syncToFormState()
  }, [syncToFormState])

  // ─── Handlers ───────────────────────────────────────────────────

  const handleAddSlot = () => {
    if (!newSlot.date) return

    setPendingSlots((prev) => [
      ...prev,
      { ...newSlot, _tempId: `temp-${Date.now()}` },
    ])

    // Reset form
    setNewSlot({
      _tempId: '',
      date: '',
      startTime: '09:00',
      basePriceEGP: '',
      capacityTotal: '20',
    })
    setShowAddForm(false)
  }

  const handleRemovePending = (tempId: string) => {
    setPendingSlots((prev) => prev.filter((s) => s._tempId !== tempId))
  }

  const handleCancelExisting = (slotId: string | number) => {
    setCancelledSlotIds((prev) => [...prev, slotId])
  }

  const handleUndoCancel = (slotId: string | number) => {
    setCancelledSlotIds((prev) => prev.filter((id) => id !== slotId))
  }

  // ─── Helpers ────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'dse-badge--available'
      case 'sold_out':
        return 'dse-badge--sold-out'
      case 'cancelled':
        return 'dse-badge--cancelled'
      case 'blacked_out':
        return 'dse-badge--blacked-out'
      default:
        return ''
    }
  }

  // Filter out cancelled existing slots from display
  const activeExistingSlots = existingSlots.filter(
    (s) => s.status !== 'cancelled'
  )

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="dse-container">
      <div className="dse-header">
        <h4 className="dse-title">Departure Slots</h4>
        <p className="dse-description">
          Manage departure dates, prices, and capacity for this experience.
        </p>
      </div>

      {/* Loading state */}
      {loadingSlots && (
        <div className="dse-loading">Loading existing slots...</div>
      )}

      {/* Existing slots table */}
      {activeExistingSlots.length > 0 && (
        <div className="dse-section">
          <h5 className="dse-section-title">Existing Slots</h5>
          <div className="dse-table-wrap">
            <table className="dse-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Price (EGP)</th>
                  <th>Capacity</th>
                  <th>Sold</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeExistingSlots.map((slot) => {
                  const isCancelled = cancelledSlotIds.includes(slot.id)
                  return (
                    <tr
                      key={slot.id}
                      className={isCancelled ? 'dse-row--cancelled' : ''}
                    >
                      <td>{formatDate(slot.date)}</td>
                      <td>{slot.startTime}</td>
                      <td>{slot.basePriceEGP ?? '—'}</td>
                      <td>{slot.capacityTotal}</td>
                      <td>{slot.capacitySold}</td>
                      <td>
                        <span
                          className={`dse-badge ${getStatusBadgeClass(
                            isCancelled ? 'cancelled' : slot.status
                          )}`}
                        >
                          {isCancelled ? 'Will Cancel' : slot.status}
                        </span>
                      </td>
                      <td>
                        {isCancelled ? (
                          <button
                            type="button"
                            className="dse-btn dse-btn--undo"
                            onClick={() => handleUndoCancel(slot.id)}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="dse-btn dse-btn--cancel"
                            onClick={() => handleCancelExisting(slot.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending new slots */}
      {pendingSlots.length > 0 && (
        <div className="dse-section">
          <h5 className="dse-section-title">New Slots (will be created on Save)</h5>
          <div className="dse-table-wrap">
            <table className="dse-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Price (EGP)</th>
                  <th>Capacity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingSlots.map((slot) => (
                  <tr key={slot._tempId} className="dse-row--new">
                    <td>{formatDate(slot.date)}</td>
                    <td>{slot.startTime}</td>
                    <td>{slot.basePriceEGP || '—'}</td>
                    <td>{slot.capacityTotal}</td>
                    <td>
                      <button
                        type="button"
                        className="dse-btn dse-btn--remove"
                        onClick={() => handleRemovePending(slot._tempId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingSlots &&
        activeExistingSlots.length === 0 &&
        pendingSlots.length === 0 && (
          <div className="dse-empty">
            No departure slots yet. Click &quot;+ Add Slot&quot; to create one.
          </div>
        )}

      {/* Add slot inline form */}
      {showAddForm && (
        <div className="dse-add-form">
          <div className="dse-add-form-grid">
            <div className="dse-form-field">
              <label className="dse-label">Date *</label>
              <input
                type="date"
                className="dse-input"
                value={newSlot.date}
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="dse-form-field">
              <label className="dse-label">Start Time</label>
              <input
                type="time"
                className="dse-input"
                value={newSlot.startTime}
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
            </div>
            <div className="dse-form-field">
              <label className="dse-label">Price (EGP)</label>
              <input
                type="number"
                className="dse-input"
                placeholder="Optional"
                value={newSlot.basePriceEGP}
                min="0"
                onChange={(e) =>
                  setNewSlot((prev) => ({
                    ...prev,
                    basePriceEGP: e.target.value,
                  }))
                }
              />
            </div>
            <div className="dse-form-field">
              <label className="dse-label">Capacity</label>
              <input
                type="number"
                className="dse-input"
                value={newSlot.capacityTotal}
                min="1"
                onChange={(e) =>
                  setNewSlot((prev) => ({
                    ...prev,
                    capacityTotal: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="dse-add-form-actions">
            <button
              type="button"
              className="dse-btn dse-btn--confirm"
              onClick={handleAddSlot}
              disabled={!newSlot.date}
            >
              Confirm Slot
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

      {/* Add slot button */}
      {!showAddForm && (
        <button
          type="button"
          className="dse-btn dse-btn--add"
          onClick={() => setShowAddForm(true)}
        >
          + Add Departure Slot
        </button>
      )}
    </div>
  )
}
