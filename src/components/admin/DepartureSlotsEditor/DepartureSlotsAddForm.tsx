import React from 'react'
import type { DepartureSlotStatus } from '@/domains/experience/types'
import type { NewSlotFormState } from './DepartureSlotsTypes'

export interface DepartureSlotsAddFormProps {
  show: boolean
  submitting: boolean
  newSlot: NewSlotFormState
  setNewSlot: React.Dispatch<React.SetStateAction<NewSlotFormState>>
  onAdd: () => void
  onClose: () => void
}

export const DepartureSlotsAddForm: React.FC<DepartureSlotsAddFormProps> = ({
  show,
  submitting,
  newSlot,
  setNewSlot,
  onAdd,
  onClose,
}) => {
  if (!show) return null

  return (
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
              Capacity Available: <strong>{Math.max(0, Number(newSlot.capacityTotal))}</strong> seats
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
          disabled={submitting || !newSlot.date || !newSlot.capacityTotal}
          onClick={onAdd}
        >
          {submitting ? 'Creating Slot...' : '✓ Create Departure Slot'}
        </button>
        <button type="button" className="dse-btn dse-btn--secondary" onClick={onClose}>
          Discard
        </button>
      </div>
    </div>
  )
}
