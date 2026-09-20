'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useField, useModal, useDrawerSlug, useForm } from '@payloadcms/ui'
import type { ArrayFieldClientComponent } from 'payload'
import '../AccommodationsEditor.css'
import type {
  AccommodationOptionItem,
  AccommodationStayItem,
  BoardBasis,
  CatalogAccommodation,
  OccupancyType,
  PricingUnit,
} from './types'
import {
  cloneRates,
  getPropertyId,
} from './types'
import { AccommodationStayCard } from './AccommodationStayCard'
import { AccommodationOptionDrawer } from './AccommodationOptionDrawer'

export const AccommodationsEditor: ArrayFieldClientComponent = (props) => {
  const { path, readOnly } = props
  const { value, setValue, errorMessage } = useField<AccommodationStayItem[]>({ path })
  const { dispatchFields, getFields, getDataByPath } = useForm()

  // Prune any stale flattened child field paths (e.g. accommodations.0.options.0.roomRates.0.*)
  // that Payload's form builder may have initialized. AccommodationsEditor is the sole authoritative
  // owner of the accommodations array, so removing descendant form-state keys prevents unflatten()
  // from colliding with and corrupting the normalized parent array on form submission.
  const pruneDescendantFields = useCallback(() => {
    const fields = getFields()
    if (!fields) return
    const prefix = `${path}.`
    const descendantKeys = Object.keys(fields).filter((k) => k.startsWith(prefix))
    if (descendantKeys.length === 0) return

    for (const key of descendantKeys) {
      dispatchFields({ type: 'REMOVE', path: key })
    }
  }, [dispatchFields, getFields, path])

  // Centralized authoritative updater: clears stale descendants then updates parent array
  const updateAccommodations = useCallback(
    (updatedStays: AccommodationStayItem[]) => {
      pruneDescendantFields()
      setValue(updatedStays)
    },
    [pruneDescendantFields, setValue],
  )

  const drawerSlug = useDrawerSlug('stay-accommodation-option-drawer')
  const { openModal, closeModal } = useModal()

  // Catalog properties state (fetched from Payload's /api/accommodations)
  const [catalog, setCatalog] = useState<CatalogAccommodation[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // Side Drawer state
  const [activeStayIndex, setActiveStayIndex] = useState<number | null>(null)
  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null)
  const [draftOption, setDraftOption] = useState<AccommodationOptionItem>({
    property: 0,
    roomCategory: '',
    boardBasis: 'bed_and_breakfast',
    pricingUnit: 'per_stay',
    roomRates: cloneRates(),
  })
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // Fetch catalog accommodations on mount
  useEffect(() => {
    let isMounted = true
    fetch('/api/accommodations?limit=300&depth=0')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (isMounted && Array.isArray(data?.docs)) {
          setCatalog(data.docs)
          setCatalogLoading(false)
        }
      })
      .catch((err) => {
        console.warn('[AccommodationsEditor] Catalog fetch error:', err)
        if (isMounted) setCatalogLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Resolve stays: use `value` if already set as array; fallback to `getDataByPath(path)` on initial load
  const rawStays = useMemo(() => {
    if (Array.isArray(value)) return value
    const fromPath = getDataByPath<AccommodationStayItem[]>(path)
    if (Array.isArray(fromPath)) return fromPath
    return []
  }, [value, getDataByPath, path])

  // Normalize stays to handle both options[] hierarchy and transitional records
  const normalizedStays: AccommodationStayItem[] = useMemo(() => {
    if (!Array.isArray(rawStays)) return []

    return rawStays.map((stay, idx) => {
      let options: AccommodationOptionItem[] = []

      if (Array.isArray(stay.options) && stay.options.length > 0) {
        options = stay.options.map((opt) => ({
          id: opt.id,
          property: opt.property,
          roomCategory: opt.roomCategory || '',
          boardBasis: opt.boardBasis || 'bed_and_breakfast',
          pricingUnit: opt.pricingUnit || 'per_stay',
          isDefault: Boolean(opt.isDefault),
          roomRates: cloneRates(opt.roomRates),
        }))
      } else if (stay.property || stay.roomRates) {
        // Transitional Grace: Existing unmigrated single-hotel stay record
        // Never inject synthetic prefixed IDs (e.g. opt_...) — leave undefined for Payload generation
        options = [
          {
            property: stay.property,
            roomCategory: stay.roomCategory || '',
            boardBasis: stay.boardBasis || 'bed_and_breakfast',
            pricingUnit: stay.pricingUnit || 'per_stay',
            roomRates: cloneRates(stay.roomRates),
          },
        ]
      }

      return {
        id: stay.id,
        order: typeof stay.order === 'number' && stay.order >= 1 ? stay.order : idx + 1,
        nights: typeof stay.nights === 'number' && stay.nights >= 1 ? stay.nights : 1,
        options,
      }
    })
  }, [value])

  // ───────────────────────────────────────────────────────────────────────────
  // Stay Card Actions
  // ───────────────────────────────────────────────────────────────────────────

  const handleAddStay = useCallback(() => {
    if (readOnly) return
    const defaultProp = catalog[0]?.id || 0
    const nextOrder = normalizedStays.length + 1
    const newStay: AccommodationStayItem = {
      order: nextOrder,
      nights: 1,
      options: [
        {
          property: defaultProp,
          roomCategory: '',
          boardBasis: 'bed_and_breakfast',
          pricingUnit: 'per_stay',
          roomRates: cloneRates(),
        },
      ],
    }
    updateAccommodations([...normalizedStays, newStay])
  }, [catalog, normalizedStays, readOnly, updateAccommodations])

  const handleRemoveStay = useCallback(
    (stayIdx: number) => {
      if (readOnly) return
      const updated = normalizedStays
        .filter((_, idx) => idx !== stayIdx)
        .map((stay, idx) => ({ ...stay, order: idx + 1 }))
      updateAccommodations(updated)
    },
    [normalizedStays, readOnly, updateAccommodations],
  )

  const handleNightsChange = useCallback(
    (stayIdx: number, rawVal: string) => {
      if (readOnly) return
      const num = parseInt(rawVal, 10)
      const validNights = isNaN(num) || num < 1 ? 1 : num
      const updated = normalizedStays.map((s, idx) =>
        idx === stayIdx ? { ...s, nights: validNights } : s,
      )
      updateAccommodations(updated)
    },
    [normalizedStays, readOnly, updateAccommodations],
  )

  const handleMoveStay = useCallback(
    (stayIdx: number, direction: 'up' | 'down') => {
      if (readOnly) return
      const targetIdx = direction === 'up' ? stayIdx - 1 : stayIdx + 1
      if (targetIdx < 0 || targetIdx >= normalizedStays.length) return

      const updated = [...normalizedStays]
      const temp = updated[stayIdx]
      updated[stayIdx] = updated[targetIdx]
      updated[targetIdx] = temp

      const reindexed = updated.map((s, idx) => ({ ...s, order: idx + 1 }))
      updateAccommodations(reindexed)
    },
    [normalizedStays, readOnly, updateAccommodations],
  )

  // ───────────────────────────────────────────────────────────────────────────
  // Option Card Actions & Drawer Triggers
  // ───────────────────────────────────────────────────────────────────────────

  const handleOpenAddOption = useCallback(
    (stayIdx: number) => {
      if (readOnly) return
      setActiveStayIndex(stayIdx)
      setActiveOptionIndex(null)

      // Find first catalog hotel not already in this stay
      const stay = normalizedStays[stayIdx]
      const existingPropIds = new Set(stay.options.map((o) => getPropertyId(o.property)))
      const availableHotel = catalog.find((c) => !existingPropIds.has(c.id))
      const chosenPropId = availableHotel?.id || catalog[0]?.id || 0

      setDraftOption({
        property: chosenPropId,
        roomCategory: '',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        isDefault: stay.options.length === 0,
        roomRates: cloneRates(),
      })
      setDrawerError(null)
      openModal(drawerSlug)
    },
    [catalog, drawerSlug, normalizedStays, openModal, readOnly],
  )

  const handleOpenEditOption = useCallback(
    (stayIdx: number, optIdx: number) => {
      if (readOnly) return
      const stay = normalizedStays[stayIdx]
      const opt = stay?.options[optIdx]
      if (!opt) return

      setActiveStayIndex(stayIdx)
      setActiveOptionIndex(optIdx)
      setDraftOption({
        id: opt.id,
        property: getPropertyId(opt.property),
        roomCategory: opt.roomCategory || '',
        boardBasis: opt.boardBasis || 'bed_and_breakfast',
        pricingUnit: opt.pricingUnit || 'per_stay',
        isDefault: Boolean(opt.isDefault),
        roomRates: cloneRates(opt.roomRates),
      })
      setDrawerError(null)
      openModal(drawerSlug)
    },
    [drawerSlug, normalizedStays, openModal, readOnly],
  )

  const handleRemoveOption = useCallback(
    (stayIdx: number, optIdx: number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (readOnly) return

      const stay = normalizedStays[stayIdx]
      if (!stay) return

      // Invariant: A Stay must have at least one Option
      if (stay.options.length <= 1) {
        alert(
          'Cannot remove the last hotel option. Each Stay must have at least one hotel option. Add another option first, or remove the entire Stay.',
        )
        return
      }

      const updatedOptions = stay.options.filter((_, idx) => idx !== optIdx)
      const updated = normalizedStays.map((s, idx) =>
        idx === stayIdx ? { ...s, options: updatedOptions } : s,
      )
      updateAccommodations(updated)
    },
    [normalizedStays, readOnly, updateAccommodations],
  )

  // ───────────────────────────────────────────────────────────────────────────
  // Drawer Editing & Save
  // ───────────────────────────────────────────────────────────────────────────

  const handlePropertyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = Number(e.target.value)
      setDraftOption((prev) => ({ ...prev, property: selectedId }))

      // Duplicate Check within current Stay
      if (activeStayIndex !== null) {
        const stay = normalizedStays[activeStayIndex]
        const isDuplicate = stay.options.some((opt, idx) => {
          if (activeOptionIndex !== null && idx === activeOptionIndex) return false
          return getPropertyId(opt.property) === selectedId
        })
        if (isDuplicate) {
          setDrawerError(
            'Duplicate Hotel: This hotel is already assigned to this Stay. Each Stay must offer distinct hotel options.',
          )
        } else {
          setDrawerError(null)
        }
      }
    },
    [activeOptionIndex, activeStayIndex, normalizedStays],
  )

  const handleRateChange = useCallback(
    (occ: OccupancyType, field: 'rateEGP' | 'enabled', val: any) => {
      setDraftOption((prev) => {
        const updatedRates = prev.roomRates.map((r) => {
          if (r.occupancy !== occ) return r
          return {
            ...r,
            [field]: field === 'rateEGP' ? Math.max(0, Number(val) || 0) : Boolean(val),
          }
        })
        return { ...prev, roomRates: updatedRates }
      })
    },
    [],
  )

  const handleApplyOption = useCallback(() => {
    if (activeStayIndex === null) return
    const stay = normalizedStays[activeStayIndex]
    if (!stay) return

    const selectedPropId = getPropertyId(draftOption.property)
    if (!selectedPropId) {
      setDrawerError('Please select an accommodation property from the catalog.')
      return
    }

    // Duplicate Check
    const isDuplicate = stay.options.some((opt, idx) => {
      if (activeOptionIndex !== null && idx === activeOptionIndex) return false
      return getPropertyId(opt.property) === selectedPropId
    })
    if (isDuplicate) {
      setDrawerError(
        'Duplicate Hotel: This hotel is already assigned to this Stay. Each Stay must offer distinct hotel options.',
      )
      return
    }

    // Rate Check: At least one enabled room rate
    const hasEnabledRate = draftOption.roomRates.some((r) => r.enabled)
    if (!hasEnabledRate) {
      setDrawerError('At least one room rate occupancy must be enabled.')
      return
    }

    // Apply to stays state
    let updatedOptions = [...stay.options]
    const optionToSave = { ...draftOption, property: selectedPropId }

    if (activeOptionIndex === null) {
      // Adding new option
      updatedOptions.push(optionToSave)
    } else {
      // Editing existing option
      updatedOptions[activeOptionIndex] = optionToSave
    }

    if (optionToSave.isDefault) {
      const targetIdx = activeOptionIndex === null ? updatedOptions.length - 1 : activeOptionIndex
      updatedOptions = updatedOptions.map((opt, idx) => ({
        ...opt,
        isDefault: idx === targetIdx,
      }))
    }

    const updatedStays = normalizedStays.map((s, idx) =>
      idx === activeStayIndex ? { ...s, options: updatedOptions } : s,
    )

    // Authoritative Payload form state update
    updateAccommodations(updatedStays)
    closeModal(drawerSlug)
  }, [
    activeOptionIndex,
    activeStayIndex,
    closeModal,
    draftOption,
    drawerSlug,
    normalizedStays,
    updateAccommodations,
  ])

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="ae-container">
      {/* Editor Section Header */}
      <div className="ae-header">
        <div className="ae-title-block">
          <h3>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Package Accommodations (Lodging Stages &amp; Hotel Options)
          </h3>
          <p>
            Configure sequential itinerary lodging stages (Stays). Each Stay represents a duration
            in nights and holds one or more alternative hotel options for travelers to choose from.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            className="ae-add-stay-btn"
            onClick={handleAddStay}
            disabled={catalogLoading}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Lodging Stay
          </button>
        )}
      </div>

      {/* Error / Validation display */}
      {errorMessage && (
        <div className="ae-alert ae-alert--error" style={{ marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Stays List */}
      <div className="ae-stays-list">
        {normalizedStays.length === 0 ? (
          <div className="ae-empty-state">
            <p>No accommodation stays configured yet.</p>
            {!readOnly && (
              <button
                type="button"
                className="ae-add-stay-btn"
                onClick={handleAddStay}
                style={{ marginTop: '0.75rem' }}
                disabled={catalogLoading}
              >
                + Add First Stay
              </button>
            )}
          </div>
        ) : (
          normalizedStays.map((stay, stayIdx) => (
            <AccommodationStayCard
              key={stay.id || `stay_${stayIdx}`}
              stay={stay}
              stayIndex={stayIdx}
              totalStays={normalizedStays.length}
              catalog={catalog}
              readOnly={readOnly}
              onNightsChange={handleNightsChange}
              onMoveStay={handleMoveStay}
              onRemoveStay={handleRemoveStay}
              onOpenAddOption={handleOpenAddOption}
              onOpenEditOption={handleOpenEditOption}
              onRemoveOption={handleRemoveOption}
              onSetDefaultOption={(stayIdx, optIdx, e) => {
                e.stopPropagation()
                if (readOnly) return
                const currentStay = normalizedStays[stayIdx]
                if (!currentStay) return
                const newOptions = currentStay.options.map((opt, idx) => ({
                  ...opt,
                  isDefault: idx === optIdx,
                }))
                const newStays = normalizedStays.map((s, idx) =>
                  idx === stayIdx ? { ...s, options: newOptions } : s,
                )
                updateAccommodations(newStays)
              }}
            />
          ))
        )}
      </div>

      {/* Side Drawer */}
      <AccommodationOptionDrawer
        drawerSlug={drawerSlug}
        activeStayIndex={activeStayIndex}
        activeOptionIndex={activeOptionIndex}
        draftOption={draftOption}
        catalog={catalog}
        readOnly={readOnly}
        drawerError={drawerError}
        onPropertyChange={handlePropertyChange}
        onDefaultChange={(val) => setDraftOption((prev) => ({ ...prev, isDefault: val }))}
        onRoomCategoryChange={(val) => setDraftOption((prev) => ({ ...prev, roomCategory: val }))}
        onBoardBasisChange={(val) => setDraftOption((prev) => ({ ...prev, boardBasis: val }))}
        onPricingUnitChange={(val) => setDraftOption((prev) => ({ ...prev, pricingUnit: val }))}
        onRateChange={handleRateChange}
        onApply={handleApplyOption}
        onCancel={() => closeModal(drawerSlug)}
      />
    </div>
  )
}
