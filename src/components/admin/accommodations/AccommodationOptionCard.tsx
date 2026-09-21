'use client'

import React from 'react'
import type { AccommodationOptionItem, CatalogAccommodation } from './types'
import {
  BOARD_BASIS_LABELS,
  getPropertyId,
  resolvePropertyName,
  resolvePropertyLocation,
  resolvePropertyTypeAndRating,
} from './types'
import './AccommodationOptionCard.css'

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
  const propId = getPropertyId(option.property)
  const matchedCatalog = catalog.find((c) => c.id === propId)
  const hotelName = resolvePropertyName(option.property, catalog)
  const location = resolvePropertyLocation(option.property, catalog)
  const typeAndRating = resolvePropertyTypeAndRating(option.property, catalog)
  const enabledRates = option.roomRates.filter((r) => r.enabled)

  // Format pricing unit compactly
  const pricingUnitLabel = option.pricingUnit === 'per_stay' ? 'Per Stay' : 'Per Night'

  return (
    <div
      className={`ae-option-row ${option.isDefault ? 'ae-option-row--default' : ''}`}
      onClick={() => onEdit(stayIndex, optionIndex)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(stayIndex, optionIndex)
        }
      }}
    >
      {/* 1. Thumbnail Image */}
      <div className="ae-option-thumb-wrap">
        {matchedCatalog?.imageUrl ? (
          <img
            src={matchedCatalog.imageUrl}
            alt={hotelName}
            className="ae-option-thumb-img"
            loading="lazy"
          />
        ) : (
          <div className="ae-option-thumb-placeholder">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
              <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
              <circle cx="12" cy="7" r="1" />
              <circle cx="12" cy="11" r="1" />
              <circle cx="12" cy="15" r="1" />
            </svg>
          </div>
        )}
      </div>

      {/* 2. Hotel Details & Commercial Tags */}
      <div className="ae-option-body">
        <div className="ae-option-title-row">
          <span className="ae-option-name">{hotelName}</span>
          {option.isDefault && (
            <span className="ae-default-badge">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Default
            </span>
          )}
        </div>

        {/* Metadata Line */}
        <div className="ae-option-meta">
          {location && <span className="ae-option-meta-loc">{location}</span>}
          {location && typeAndRating && <span className="ae-meta-sep">•</span>}
          {typeAndRating && <span className="ae-option-meta-type">{typeAndRating}</span>}
        </div>

        {/* Spec Chips */}
        <div className="ae-option-chips">
          {option.roomCategory && (
            <span className="ae-chip">{option.roomCategory}</span>
          )}
          {option.boardBasis && (
            <span className="ae-chip">
              {BOARD_BASIS_LABELS[option.boardBasis] || option.boardBasis}
            </span>
          )}
          <span className="ae-chip">{pricingUnitLabel}</span>
        </div>
      </div>

      {/* 3. Room Rates Column */}
      <div className="ae-option-rates-col">
        <span className="ae-rates-col-title">Room Rates (EGP)</span>
        <div className="ae-rates-col-list">
          {enabledRates.length === 0 ? (
            <span className="ae-rate-col-empty">No active rates</span>
          ) : (
            enabledRates.slice(0, 3).map((r) => {
              const occLabel =
                r.occupancy === 'single'
                  ? 'Single'
                  : r.occupancy === 'double'
                    ? 'Double'
                    : r.occupancy === 'triple'
                      ? 'Triple'
                      : 'Quad'
              return (
                <div key={r.occupancy} className="ae-rate-col-item">
                  <span className="ae-rate-col-label">{occLabel}</span>
                  <span className="ae-rate-col-val">{r.rateEGP.toLocaleString()}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 4. Action Buttons Column */}
      <div className="ae-option-actions-col" onClick={(e) => e.stopPropagation()}>
        {!option.isDefault && !readOnly && onSetDefault && (
          <button
            type="button"
            className="ae-btn-make-default"
            title="Set as Default Option for this stay"
            onClick={(e) => onSetDefault(stayIndex, optionIndex, e)}
          >
            Make Default
          </button>
        )}

        <button
          type="button"
          className="ae-btn-action-edit"
          title="Edit Accommodation Option"
          onClick={() => onEdit(stayIndex, optionIndex)}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Edit
        </button>

        {!readOnly && (
          <button
            type="button"
            className="ae-btn-action-trash"
            title={
              totalOptionsInStay <= 1
                ? 'A stay must have at least one hotel option'
                : 'Remove this hotel option'
            }
            disabled={totalOptionsInStay <= 1}
            onClick={(e) => onRemove(stayIndex, optionIndex, e)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
