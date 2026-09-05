import React from 'react'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import type { EditSlotFormState } from './DepartureSlotsTypes'

export interface DepartureSlotsEditFormProps {
  editingSlot: EditSlotFormState | null
  submitting: boolean
  setEditingSlot: React.Dispatch<React.SetStateAction<EditSlotFormState | null>>
  onSave: () => void
  onCancel: () => void
}

export const DepartureSlotsEditForm: React.FC<DepartureSlotsEditFormProps> = ({
  editingSlot,
  submitting,
  setEditingSlot,
  onSave,
  onCancel,
}) => {
  if (!editingSlot) return null

  return (
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
          disabled={submitting || !editingSlot.date || !editingSlot.capacityTotal}
          onClick={onSave}
        >
          {submitting ? 'Saving Changes...' : '✓ Save Slot Updates'}
        </button>
        <button type="button" className="dse-btn dse-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
