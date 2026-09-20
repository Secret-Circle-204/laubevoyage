'use client'

import React from 'react'
import type { AccommodationStayItem, CatalogAccommodation } from './types'
import { AccommodationOptionCard } from './AccommodationOptionCard'

interface AccommodationStayCardProps {
  stay: AccommodationStayItem
  stayIndex: number
  totalStays: number
  catalog: CatalogAccommodation[]
  readOnly?: boolean
  onNightsChange: (stayIdx: number, value: string) => void
  onMoveStay: (stayIdx: number, direction: 'up' | 'down') => void
  onRemoveStay: (stayIdx: number) => void
  onOpenAddOption: (stayIdx: number) => void
  onOpenEditOption: (stayIdx: number, optIdx: number) => void
  onRemoveOption: (stayIdx: number, optIdx: number, e: React.MouseEvent) => void
  onSetDefaultOption?: (stayIdx: number, optIdx: number, e: React.MouseEvent) => void
}

export const AccommodationStayCard: React.FC<AccommodationStayCardProps> = ({
  stay,
  stayIndex,
  totalStays,
  catalog,
  readOnly = false,
  onNightsChange,
  onMoveStay,
  onRemoveStay,
  onOpenAddOption,
  onOpenEditOption,
  onRemoveOption,
  onSetDefaultOption,
}) => {
  return (
    <div className="ae-stay-card">
      {/* Stay Card Header */}
      <div className="ae-stay-header">
        <div className="ae-stay-meta">
          <span className="ae-stay-badge">
            <span className="ae-stay-badge-seq">Stage #{stay.order}</span>
            <span>Stay {stayIndex + 1}</span>
          </span>

          <div className="ae-nights-field">
            <label htmlFor={`stay-nights-${stayIndex}`}>Duration:</label>
            <input
              id={`stay-nights-${stayIndex}`}
              type="number"
              min="1"
              disabled={readOnly}
              value={stay.nights}
              onChange={(e) => onNightsChange(stayIndex, e.target.value)}
            />
            <span>Nights</span>
          </div>
        </div>

        {!readOnly && (
          <div className="ae-stay-actions">
            <button
              type="button"
              className="ae-btn-icon"
              title="Move Stay Up"
              disabled={stayIndex === 0}
              onClick={() => onMoveStay(stayIndex, 'up')}
            >
              ▲
            </button>
            <button
              type="button"
              className="ae-btn-icon"
              title="Move Stay Down"
              disabled={stayIndex === totalStays - 1}
              onClick={() => onMoveStay(stayIndex, 'down')}
            >
              ▼
            </button>
            <button
              type="button"
              className="ae-btn-icon ae-btn-icon--danger"
              title="Remove Stay"
              onClick={() => onRemoveStay(stayIndex)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Hotel Options Section */}
      <div className="ae-options-container">
        <div className="ae-options-label">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="9" y1="6" x2="9" y2="6.01" />
            <line x1="15" y1="6" x2="15" y2="6.01" />
            <line x1="9" y1="10" x2="9" y2="10.01" />
            <line x1="15" y1="10" x2="15" y2="10.01" />
            <line x1="9" y1="14" x2="9" y2="14.01" />
            <line x1="15" y1="14" x2="15" y2="14.01" />
            <line x1="9" y1="18" x2="15" y2="18" />
          </svg>
          Hotel Options in this Stage ({stay.options.length}):
        </div>

        <div className="ae-options-grid">
          {stay.options.map((option, optIdx) => (
            <AccommodationOptionCard
              key={option.id || `opt_${optIdx}`}
              option={option}
              stayIndex={stayIndex}
              optionIndex={optIdx}
              totalOptionsInStay={stay.options.length}
              catalog={catalog}
              readOnly={readOnly}
              onEdit={onOpenEditOption}
              onRemove={onRemoveOption}
              onSetDefault={onSetDefaultOption}
            />
          ))}

          {!readOnly && (
            <button
              type="button"
              className="ae-add-option-btn"
              onClick={() => onOpenAddOption(stayIndex)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Add Hotel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
