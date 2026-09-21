'use client'

import React, { useState } from 'react'
import { Drawer, DrawerContentContainer, Banner } from '@payloadcms/ui'
import type {
  AccommodationOptionItem,
  BoardBasis,
  CatalogAccommodation,
  OccupancyType,
  PricingUnit,
} from './types'
import {
  BOARD_BASIS_LABELS,
  getPropertyId,
  PRICING_UNIT_LABELS,
  resolvePropertyName,
  resolvePropertyLocation,
  resolvePropertyTypeAndRating,
} from './types'
import { RoomRatesEditor } from './RoomRatesEditor'
import { AccommodationPropertyPicker } from './AccommodationPropertyPicker'
import type {
  CatalogAccommodationDTO,
  DestinationStopOption,
} from '@/application/actions/accommodation-admin-actions'
import './AccommodationOptionDrawer.css'

interface AccommodationOptionDrawerProps {
  drawerSlug: string
  activeStayIndex: number | null
  activeOptionIndex: number | null
  draftOption: AccommodationOptionItem
  catalog: CatalogAccommodation[]
  journeyCityIds?: number[]
  destinationStops: DestinationStopOption[]
  stayExistingPropertyIds: number[]
  readOnly?: boolean
  drawerError: string | null
  onPropertySelect: (propertyId: number, propertyDTO?: CatalogAccommodationDTO) => void
  onDefaultChange: (value: boolean) => void
  onRoomCategoryChange: (value: string) => void
  onBoardBasisChange: (value: BoardBasis) => void
  onPricingUnitChange: (value: PricingUnit) => void
  onRateChange: (occupancy: OccupancyType, field: 'rateEGP' | 'enabled', val: number | boolean) => void
  onApply: () => void
  onCancel: () => void
}

export const AccommodationOptionDrawer: React.FC<AccommodationOptionDrawerProps> = ({
  drawerSlug,
  activeStayIndex,
  activeOptionIndex,
  draftOption,
  catalog,
  journeyCityIds,
  destinationStops,
  stayExistingPropertyIds,
  readOnly = false,
  drawerError,
  onPropertySelect,
  onDefaultChange,
  onRoomCategoryChange,
  onBoardBasisChange,
  onPricingUnitChange,
  onRateChange,
  onApply,
  onCancel,
}) => {
  const stayNumber = String((activeStayIndex ?? 0) + 1).padStart(2, '0')
  const propId = getPropertyId(draftOption.property)
  const isEditing = activeOptionIndex !== null

  // User override state to switch views
  const [browseOverride, setBrowseOverride] = useState<boolean | null>(null)
  const [prevTrack, setPrevTrack] = useState<{
    stayIdx: number | null
    optIdx: number | null
    propId: number
  }>({
    stayIdx: activeStayIndex,
    optIdx: activeOptionIndex,
    propId,
  })

  // Adjust state during render when active option changes (Official React pattern without useEffect)
  if (
    prevTrack.stayIdx !== activeStayIndex ||
    prevTrack.optIdx !== activeOptionIndex ||
    prevTrack.propId !== propId
  ) {
    setPrevTrack({
      stayIdx: activeStayIndex,
      optIdx: activeOptionIndex,
      propId,
    })
    setBrowseOverride(null)
  }

  const isBrowsingCatalog = browseOverride !== null ? browseOverride : propId === 0

  const propertyName = resolvePropertyName(draftOption.property, catalog)
  const location = resolvePropertyLocation(draftOption.property, catalog)
  const typeAndRating = resolvePropertyTypeAndRating(draftOption.property, catalog)

  // Resolve City name and ID for the stay header
  const matchedCatalog = catalog.find((c) => c.id === propId)
  const stayCityId =
    matchedCatalog?.cityId ||
    destinationStops[activeStayIndex ?? 0]?.id ||
    destinationStops[0]?.id

  const stayCityName =
    matchedCatalog?.cityName ||
    destinationStops.find((d) => d.id === stayCityId)?.name ||
    destinationStops[activeStayIndex ?? 0]?.name ||
    (destinationStops[0]?.name ?? 'Destination')

  const handleSelectFromPicker = (selectedId: number, propertyDTO?: CatalogAccommodationDTO) => {
    onPropertySelect(selectedId, propertyDTO)
    setBrowseOverride(false)
  }

  return (
    <Drawer slug={drawerSlug} title="">
      <DrawerContentContainer>
        <div className="ae-drawer-shell">
          {/* Drawer Header */}
          <div className="ae-drawer-top-bar">
            {isBrowsingCatalog && propId > 0 ? (
              <button
                type="button"
                className="ae-drawer-back-btn"
                onClick={() => setBrowseOverride(false)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Back to accommodation details</span>
              </button>
            ) : (
              <div className="ae-drawer-title-group">
                <span className="ae-drawer-eyebrow">
                  {isBrowsingCatalog
                    ? 'SELECT PROPERTY'
                    : isEditing
                      ? 'EDIT ACCOMMODATION'
                      : 'ADD ACCOMMODATION'}
                </span>
                <h3 className="ae-drawer-heading">
                  {isBrowsingCatalog
                    ? 'Catalog Accommodation Browser'
                    : `Stay ${stayNumber} · ${stayCityName}`}
                </h3>
              </div>
            )}
          </div>

          {/* Error Banner if any */}
          {drawerError && (
            <div className="ae-drawer-error-wrap">
              <Banner type="error">{drawerError}</Banner>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE B: CATALOG BROWSER                                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {isBrowsingCatalog ? (
            <div className="ae-drawer-browser-mode">
              <AccommodationPropertyPicker
                selectedPropertyId={propId}
                catalog={catalog}
                journeyCityIds={journeyCityIds}
                destinationStops={destinationStops}
                stayExistingPropertyIds={stayExistingPropertyIds}
                readOnly={readOnly}
                defaultCityId={stayCityId}
                onSelectProperty={handleSelectFromPicker}
              />
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* MODE A: FOCUSED EDITING WORKSPACE                           */
            /* ─────────────────────────────────────────────────────────── */
            <div className="ae-drawer-workspace-mode">
              {/* 1. Property Card */}
              <div className="ae-drawer-section">
                <div className="ae-drawer-section-header">
                  <span className="ae-drawer-section-title">PROPERTY</span>
                </div>
                <div className="ae-property-summary-card">
                  <div className="ae-property-summary-info">
                    <span className="ae-property-summary-name">{propertyName}</span>
                    <div className="ae-property-summary-meta">
                      {location && <span>{location}</span>}
                      {location && typeAndRating && <span className="ae-meta-sep">•</span>}
                      {typeAndRating && <span>{typeAndRating}</span>}
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      className="ae-btn-change-property"
                      onClick={() => setBrowseOverride(true)}
                    >
                      Change property
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Commercial Terms */}
              <div className="ae-drawer-section">
                <div className="ae-drawer-section-header">
                  <span className="ae-drawer-section-title">COMMERCIAL TERMS</span>
                </div>

                {/* Default Accommodation Switch */}
                <div className="ae-drawer-field-row ae-drawer-default-row">
                  <div className="ae-default-switch-text">
                    <span className="ae-default-switch-label">Default accommodation</span>
                    <span className="ae-default-switch-sub">
                      Pre-selected base option in the booking flow
                    </span>
                  </div>
                  <label className="ae-toggle-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(draftOption.isDefault)}
                      disabled={readOnly}
                      onChange={(e) => onDefaultChange(e.target.checked)}
                    />
                    <span className="ae-toggle-slider" />
                  </label>
                </div>

                {/* Room Category */}
                <div className="ae-drawer-field-row">
                  <label htmlFor="ae-room-cat-input" className="ae-drawer-field-label">
                    Room category
                  </label>
                  <input
                    id="ae-room-cat-input"
                    type="text"
                    className="ae-drawer-text-input"
                    placeholder="e.g. Deluxe Nile View"
                    value={draftOption.roomCategory || ''}
                    disabled={readOnly}
                    onChange={(e) => onRoomCategoryChange(e.target.value)}
                  />
                </div>

                {/* Board Basis */}
                <div className="ae-drawer-field-row">
                  <label htmlFor="ae-board-basis-select" className="ae-drawer-field-label">
                    Board basis
                  </label>
                  <select
                    id="ae-board-basis-select"
                    className="ae-drawer-select-input"
                    value={draftOption.boardBasis || 'bed_and_breakfast'}
                    disabled={readOnly}
                    onChange={(e) => onBoardBasisChange(e.target.value as BoardBasis)}
                  >
                    {(Object.keys(BOARD_BASIS_LABELS) as BoardBasis[]).map((bb) => (
                      <option key={bb} value={bb}>
                        {BOARD_BASIS_LABELS[bb]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pricing Unit */}
                <div className="ae-drawer-field-row">
                  <label htmlFor="ae-pricing-unit-select" className="ae-drawer-field-label">
                    Pricing
                  </label>
                  <select
                    id="ae-pricing-unit-select"
                    className="ae-drawer-select-input"
                    value={draftOption.pricingUnit || 'per_stay'}
                    disabled={readOnly}
                    onChange={(e) => onPricingUnitChange(e.target.value as PricingUnit)}
                  >
                    {(Object.keys(PRICING_UNIT_LABELS) as PricingUnit[]).map((pu) => (
                      <option key={pu} value={pu}>
                        {PRICING_UNIT_LABELS[pu]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Room Rates */}
              <div className="ae-drawer-section">
                <div className="ae-drawer-section-header">
                  <span className="ae-drawer-section-title">ROOM RATES</span>
                </div>
                <RoomRatesEditor
                  rates={draftOption.roomRates}
                  readOnly={readOnly}
                  onChange={onRateChange}
                />
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* Sticky Drawer Footer                                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="ae-drawer-sticky-footer">
            <button type="button" className="ae-drawer-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            {!readOnly && (
              <button
                type="button"
                className="ae-drawer-btn-save"
                onClick={onApply}
                disabled={Boolean(drawerError) || propId === 0}
              >
                Save Option
              </button>
            )}
          </div>
        </div>
      </DrawerContentContainer>
    </Drawer>
  )
}
