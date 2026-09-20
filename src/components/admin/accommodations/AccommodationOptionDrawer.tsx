'use client'

import React from 'react'
import { Drawer } from '@payloadcms/ui'
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
} from './types'
import { RoomRatesEditor } from './RoomRatesEditor'

interface AccommodationOptionDrawerProps {
  drawerSlug: string
  activeStayIndex: number | null
  activeOptionIndex: number | null
  draftOption: AccommodationOptionItem
  catalog: CatalogAccommodation[]
  readOnly?: boolean
  drawerError: string | null
  onPropertyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onDefaultChange: (value: boolean) => void
  onRoomCategoryChange: (value: string) => void
  onBoardBasisChange: (value: BoardBasis) => void
  onPricingUnitChange: (value: PricingUnit) => void
  onRateChange: (occupancy: OccupancyType, field: 'rateEGP' | 'enabled', val: any) => void
  onApply: () => void
  onCancel: () => void
}

export const AccommodationOptionDrawer: React.FC<AccommodationOptionDrawerProps> = ({
  drawerSlug,
  activeStayIndex,
  activeOptionIndex,
  draftOption,
  catalog,
  readOnly = false,
  drawerError,
  onPropertyChange,
  onDefaultChange,
  onRoomCategoryChange,
  onBoardBasisChange,
  onPricingUnitChange,
  onRateChange,
  onApply,
  onCancel,
}) => {
  const stayNumber = (activeStayIndex ?? 0) + 1
  const isEditing = activeOptionIndex !== null

  return (
    <Drawer
      slug={drawerSlug}
      title={
        isEditing
          ? `Edit Hotel Option — Stay #${stayNumber}`
          : `Add Hotel Option — Stay #${stayNumber}`
      }
    >
      <div className="ae-drawer-body">
        <div>
          <h4 className="ae-drawer-header-title">Accommodation Commercial Configuration</h4>
          <p className="ae-drawer-header-desc">
            Define the catalog property, board basis, pricing unit, and room rate tiers for this
            specific option within Stay #{stayNumber}.
          </p>
        </div>

        {drawerError && <div className="ae-alert ae-alert--error">{drawerError}</div>}

        {/* Property Selector */}
        <div className="ae-form-group">
          <label className="ae-form-label">
            Catalog Accommodation Property <span className="ae-form-label-required">*</span>
          </label>
          <p className="ae-form-desc">
            Select an authoritative hotel/resort/lodge entity from the Accommodations catalog.
          </p>
          <select
            className="ae-select"
            value={getPropertyId(draftOption.property) || ''}
            onChange={onPropertyChange}
            disabled={readOnly}
          >
            <option value="" disabled>
              -- Select Catalog Property --
            </option>
            {catalog.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name} ({hotel.type || 'hotel'}
                {hotel.rating ? ` • ${hotel.rating}★` : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Authoritative Default Option Toggle */}
        <div className="ae-form-group">
          <label
            className="ae-form-label"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={Boolean(draftOption.isDefault)}
              onChange={(e) => onDefaultChange(e.target.checked)}
              disabled={readOnly}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600 }}>Set as Authoritative Default Option for this stay</span>
          </label>
          <p className="ae-form-desc">
            The base accommodation included in package pricing upon initial customer visit. Exactly one hotel must be marked as default per stay.
          </p>
        </div>

        {/* Room Category */}
        <div className="ae-form-group">
          <label className="ae-form-label">Room Category (Optional)</label>
          <p className="ae-form-desc">
            e.g. Deluxe Nile View Room, Superior Suite, Standard Garden View
          </p>
          <input
            type="text"
            className="ae-input"
            placeholder="e.g. Deluxe Sea View Room"
            value={draftOption.roomCategory || ''}
            onChange={(e) => onRoomCategoryChange(e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* Board Basis */}
        <div className="ae-form-group">
          <label className="ae-form-label">Board Basis</label>
          <p className="ae-form-desc">Meal plan arrangement included for this hotel option.</p>
          <select
            className="ae-select"
            value={draftOption.boardBasis || 'bed_and_breakfast'}
            onChange={(e) => onBoardBasisChange(e.target.value as BoardBasis)}
            disabled={readOnly}
          >
            {(Object.keys(BOARD_BASIS_LABELS) as BoardBasis[]).map((bb) => (
              <option key={bb} value={bb}>
                {BOARD_BASIS_LABELS[bb]}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Unit */}
        <div className="ae-form-group">
          <label className="ae-form-label">
            Pricing Unit <span className="ae-form-label-required">*</span>
          </label>
          <p className="ae-form-desc">
            Choose whether room rates are billed fixed per entire stay or multiplied by nights.
          </p>
          <select
            className="ae-select"
            value={draftOption.pricingUnit || 'per_stay'}
            onChange={(e) => onPricingUnitChange(e.target.value as PricingUnit)}
            disabled={readOnly}
          >
            {(Object.keys(PRICING_UNIT_LABELS) as PricingUnit[]).map((pu) => (
              <option key={pu} value={pu}>
                {PRICING_UNIT_LABELS[pu]}
              </option>
            ))}
          </select>
        </div>

        {/* Room Rates Table */}
        <RoomRatesEditor
          rates={draftOption.roomRates}
          readOnly={readOnly}
          onChange={onRateChange}
        />

        {/* Drawer Actions */}
        <div className="ae-drawer-footer">
          <button type="button" className="ae-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          {!readOnly && (
            <button
              type="button"
              className="ae-btn-save"
              onClick={onApply}
              disabled={Boolean(drawerError) || !getPropertyId(draftOption.property)}
            >
              Apply &amp; Update Form
            </button>
          )}
        </div>
      </div>
    </Drawer>
  )
}
