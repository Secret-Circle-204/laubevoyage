'use client'

import React from 'react'
import type { AccommodationOptionItem, CatalogAccommodation } from './types'
import { resolvePropertyName } from './types'

interface AccommodationOptionCardProps {
  option: AccommodationOptionItem
  stayIndex: number
  optionIndex: number
  totalOptionsInStay: number
  catalog: CatalogAccommodation[]
  readOnly?: boolean
  onEdit: (stayIdx: number, optIdx: number) => void
  onRemove: (stayIdx: number, optIdx: number, e: React.MouseEvent) => void
  onSetDefault?: (stayIdx: number, optIdx: number, e: React.MouseEvent) => void
}

export const AccommodationOptionCard: React.FC<AccommodationOptionCardProps> = ({
  option,
  stayIndex,
  optionIndex,
  totalOptionsInStay,
  catalog,
  readOnly = false,
  onEdit,
  onRemove,
  onSetDefault,
}) => {
  const hotelName = resolvePropertyName(option.property, catalog)
  const enabledRates = option.roomRates.filter((r) => r.enabled)

  return (
    <div
      className={`ae-option-card ${option.isDefault ? 'ae-option-card--default' : ''}`}
      onClick={() => onEdit(stayIndex, optionIndex)}
      title="Click to edit hotel options in Side Drawer"
    >
      <div className="ae-option-top">
        <div
          className="ae-hotel-title"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🏨</span>
          <span>{hotelName}</span>
          {option.isDefault && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '9999px',
                background: '#0d9488',
                color: '#ffffff',
                marginLeft: '4px',
              }}
            >
              ★ Default
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!option.isDefault && !readOnly && onSetDefault && (
            <button
              type="button"
              className="ae-make-default-btn"
              title="Set as Default Accommodation for this stay"
              onClick={(e) => onSetDefault(stayIndex, optionIndex, e)}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Make Default
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              className="ae-hotel-remove-btn"
              title={
                totalOptionsInStay <= 1
                  ? 'A stay must have at least one hotel option'
                  : 'Remove this hotel option'
              }
              disabled={totalOptionsInStay <= 1}
              onClick={(e) => onRemove(stayIndex, optionIndex, e)}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="ae-option-details">
        {option.roomCategory && (
          <span className="ae-pill-tag ae-pill-tag--room">{option.roomCategory}</span>
        )}
        {option.boardBasis && (
          <span className="ae-pill-tag ae-pill-tag--board">
            {option.boardBasis === 'bed_and_breakfast'
              ? 'BB'
              : option.boardBasis === 'half_board'
                ? 'HB'
                : option.boardBasis === 'full_board'
                  ? 'FB'
                  : 'AI'}
          </span>
        )}
        <span className="ae-pill-tag ae-pill-tag--unit">
          {option.pricingUnit === 'per_night' ? 'Per Night' : 'Per Stay'}
        </span>
      </div>

      <div className="ae-rates-summary">
        {enabledRates.length === 0 ? (
          <span style={{ color: '#e53e3e' }}>No active rates</span>
        ) : (
          enabledRates.map((r) => (
            <span key={r.occupancy} className="ae-rates-summary-item">
              {r.occupancy.toUpperCase().slice(0, 3)}:{' '}
              <strong>{r.rateEGP.toLocaleString()} EGP</strong>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
