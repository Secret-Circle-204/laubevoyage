'use client'

import React, { useState } from 'react'
import type { AccommodationStayItem, CatalogAccommodation } from './types'
import { getPropertyId } from './types'
import { AccommodationOptionCard } from './AccommodationOptionCard'
import type { DestinationStopOption } from '@/application/actions/accommodation-admin-actions'

interface AccommodationStayCardProps {
  stay: AccommodationStayItem
  stayIndex: number
  totalStays: number
  catalog: CatalogAccommodation[]
  destinationStops: DestinationStopOption[]
  readOnly?: boolean
  onDestinationChange?: (stayIdx: number, newCityId: number) => void
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
  destinationStops,
  readOnly = false,
  onDestinationChange,
  onNightsChange,
  onMoveStay,
  onRemoveStay,
  onOpenAddOption,
  onOpenEditOption,
  onRemoveOption,
  onSetDefaultOption,
}) => {
  const [isEditingNights, setIsEditingNights] = useState(false)

  // Stage display number (01, 02, etc.)
  const stageNumber = String(stayIndex + 1).padStart(2, '0')

  // Resolve City: preference to default option property, then first option, then destination stops
  const defaultOption = stay.options.find((o) => o.isDefault) || stay.options[0]
  const propId = defaultOption ? getPropertyId(defaultOption.property) : 0
  const matchedCatalog = catalog.find((c) => c.id === propId)

  const currentCityId =
    matchedCatalog?.cityId ||
    destinationStops[stayIndex % (destinationStops.length || 1)]?.id ||
    destinationStops[0]?.id

  const stageCityName =
    matchedCatalog?.cityName ||
    destinationStops.find((d) => d.id === currentCityId)?.name ||
    destinationStops[stayIndex]?.name ||
    (destinationStops[0]?.name ?? `Stay ${stay.order}`)

  return (
    <div className="ae-stay-timeline-row">
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Left Timeline Rail Column                                         */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="ae-timeline-rail">
        <div className="ae-timeline-badge">
          <span className="ae-timeline-number">{stageNumber}</span>
          <span className="ae-timeline-label">STAGE</span>
        </div>
        <div className="ae-timeline-node-wrap">
          <div className="ae-timeline-circle" />
          {stayIndex < totalStays - 1 && <div className="ae-timeline-line" />}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Main Stay Stage Content Area                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="ae-stay-content-panel">
        {/* Stage Header */}
        <div className="ae-stay-header">
          <div className="ae-stay-header-info">
            <div className="ae-stay-city-row">
              {destinationStops.length > 1 && !readOnly && onDestinationChange ? (
                <div className="ae-stay-dest-select-wrap">
                  <select
                    className="ae-stay-dest-select"
                    value={currentCityId}
                    onChange={(e) => onDestinationChange(stayIndex, Number(e.target.value))}
                    title="Change stage destination city"
                  >
                    {destinationStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="ae-stay-dest-caret"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              ) : (
                <h3 className="ae-stay-city-title">{stageCityName}</h3>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className="ae-stay-edit-pencil-btn"
                  title="Edit duration in nights"
                  onClick={() => setIsEditingNights((v) => !v)}
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
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Duration Subtitle / Inline Editor */}
            {isEditingNights && !readOnly ? (
              <div className="ae-stay-nights-editor">
                <input
                  type="number"
                  min="1"
                  className="ae-stay-nights-input"
                  value={stay.nights}
                  onChange={(e) => onNightsChange(stayIndex, e.target.value)}
                  autoFocus
                  onBlur={() => setIsEditingNights(false)}
                />
                <span className="ae-stay-nights-text">
                  {stay.nights === 1 ? 'Night' : 'Nights'}
                </span>
                <button
                  type="button"
                  className="ae-stay-nights-done-btn"
                  onClick={() => setIsEditingNights(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <span
                className="ae-stay-nights-caption"
                onClick={() => !readOnly && setIsEditingNights(true)}
                title={readOnly ? undefined : 'Click to edit duration'}
              >
                {stay.nights} {stay.nights === 1 ? 'Night' : 'Nights'}
              </span>
            )}
          </div>

          {/* Top-Right Stage Controls */}
          {!readOnly && (
            <div className="ae-stay-actions-group">
              <button
                type="button"
                className="ae-stage-btn"
                title="Move Stage Earlier"
                disabled={stayIndex === 0}
                onClick={() => onMoveStay(stayIndex, 'up')}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="ae-stage-btn"
                title="Move Stage Later"
                disabled={stayIndex === totalStays - 1}
                onClick={() => onMoveStay(stayIndex, 'down')}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="ae-stage-btn ae-stage-btn--danger"
                title="Remove this entire stay stage"
                onClick={() => onRemoveStay(stayIndex)}
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
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Inner Accommodation Options Container                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="ae-options-card">
          <div className="ae-options-card-header">
            <div className="ae-options-card-title-group">
              <div className="ae-options-title-row">
                <span className="ae-options-title">Accommodation Options</span>
                <span className="ae-options-count-badge">{stay.options.length}</span>
              </div>
              <p className="ae-options-subtitle">Alternative hotels available for this stay.</p>
            </div>

            {!readOnly && (
              <button
                type="button"
                className="ae-btn-add-option"
                onClick={() => onOpenAddOption(stayIndex)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                <span>Add Hotel Option</span>
              </button>
            )}
          </div>

          {/* Hotel Option Rows List */}
          <div className="ae-options-list">
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
          </div>
        </div>
      </div>
    </div>
  )
}
