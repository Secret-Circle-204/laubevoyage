'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useField, useModal, useDrawerSlug, useForm, useFormFields, Button, Banner } from '@payloadcms/ui'
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
import { cloneRates, getPropertyId } from './types'
import { AccommodationStayCard } from './AccommodationStayCard'
import { AccommodationOptionDrawer } from './AccommodationOptionDrawer'
import {
  getAccommodationsForAdminAction,
  type CatalogAccommodationDTO,
  type DestinationStopOption,
} from '@/application/actions/accommodation-admin-actions'

export const AccommodationsEditor: ArrayFieldClientComponent = (props) => {
  const { path, readOnly } = props
  const { value, setValue, errorMessage } = useField<AccommodationStayItem[]>({ path })
  const { dispatchFields, getFields, getDataByPath } = useForm()

  // ───────────────────────────────────────────────────────────────────────────
  // Reactive Destination Context (Payload Form State SSOT)
  // ───────────────────────────────────────────────────────────────────────────
  const journeyFormFields = useFormFields(([fields]) => ({
    city: fields.city?.value,
    destinations: fields.destinations?.value,
  }))

  const journeyCityIds = useMemo(() => {
    const ids: number[] = []
    const cVal = journeyFormFields?.city
    if (typeof cVal === 'number' && !isNaN(cVal) && cVal > 0) {
      ids.push(cVal)
    } else if (typeof cVal === 'string' && !isNaN(Number(cVal)) && Number(cVal) > 0) {
      ids.push(Number(cVal))
    } else if (typeof cVal === 'object' && cVal !== null && 'id' in cVal) {
      const numId = Number((cVal as { id: unknown }).id)
      if (!isNaN(numId) && numId > 0) ids.push(numId)
    }

    const dVal = journeyFormFields?.destinations
    if (Array.isArray(dVal)) {
      for (const d of dVal) {
        if (typeof d === 'number' && !isNaN(d) && d > 0) {
          ids.push(d)
        } else if (typeof d === 'string' && !isNaN(Number(d)) && Number(d) > 0) {
          ids.push(Number(d))
        } else if (typeof d === 'object' && d !== null && 'id' in d) {
          const numId = Number((d as { id: unknown }).id)
          if (!isNaN(numId) && numId > 0) ids.push(numId)
        }
      }
    }
    return Array.from(new Set(ids))
  }, [journeyFormFields?.city, journeyFormFields?.destinations])

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

  // Catalog properties & destination stops state
  const [catalog, setCatalog] = useState<CatalogAccommodation[]>([])
  const [destinationStops, setDestinationStops] = useState<DestinationStopOption[]>([])
  const [lastFetchedKey, setLastFetchedKey] = useState<string>('')

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
        options = [
          {
            property: stay.property as
              number | { id: number | string; name?: string; type?: string; rating?: number },
            roomCategory: stay.roomCategory || '',
            boardBasis: stay.boardBasis as BoardBasis,
            pricingUnit: stay.pricingUnit as PricingUnit,
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
  }, [rawStays])

  // Extract all property IDs currently assigned in any stay to prevent missing metadata
  const assignedPropertyIds = useMemo(() => {
    const ids = new Set<number>()
    for (const stay of normalizedStays) {
      for (const opt of stay.options) {
        const propId = getPropertyId(opt.property)
        if (propId > 0) ids.add(propId)
      }
    }
    return Array.from(ids)
  }, [normalizedStays])

  const currentQueryKey = useMemo(
    () => `${journeyCityIds.join(',')}:${assignedPropertyIds.join(',')}`,
    [journeyCityIds, assignedPropertyIds],
  )
  const catalogLoading = lastFetchedKey !== currentQueryKey

  // Fetch destination-filtered catalog accommodations
  useEffect(() => {
    let isMounted = true

    getAccommodationsForAdminAction({
      journeyCityIds,
      assignedPropertyIds,
    })
      .then((res) => {
        if (!isMounted) return
        if (res.success) {
          // Combine main docs and assigned docs into unified catalog (no duplicates)
          const map = new Map<number, CatalogAccommodation>()
          for (const doc of res.docs) {
            map.set(doc.id, doc)
          }
          for (const doc of res.assignedDocs) {
            if (!map.has(doc.id)) {
              map.set(doc.id, doc)
            }
          }
          setCatalog(Array.from(map.values()))
          setDestinationStops(res.destinationStops)
        } else {
          console.warn('[AccommodationsEditor] Failed to fetch accommodations:', res.message)
        }
        setLastFetchedKey(currentQueryKey)
      })
      .catch((err) => {
        console.warn('[AccommodationsEditor] Action error:', err)
        if (isMounted) setLastFetchedKey(currentQueryKey)
      })

    return () => {
      isMounted = false
    }
  }, [journeyCityIds, assignedPropertyIds, currentQueryKey])

  // ───────────────────────────────────────────────────────────────────────────
  // Stay Card Actions
  // ───────────────────────────────────────────────────────────────────────────

  const handleAddStay = useCallback(() => {
    if (readOnly) return

    // Sequentially assign destination based on existing stay count
    const destCount = destinationStops.length || 1
    const destIdx = normalizedStays.length % destCount
    const targetStop = destinationStops[destIdx]
    const matchingHotel = targetStop
      ? catalog.find((c) => c.cityId === targetStop.id)
      : null
    const defaultProp = matchingHotel?.id || catalog[0]?.id || 0

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
          isDefault: true,
          roomRates: cloneRates(),
        },
      ],
    }
    updateAccommodations([...normalizedStays, newStay])
  }, [catalog, destinationStops, normalizedStays, readOnly, updateAccommodations])

  const handleStayDestinationChange = useCallback(
    (stayIdx: number, newCityId: number) => {
      if (readOnly) return
      const stay = normalizedStays[stayIdx]
      if (!stay) return

      // Find first catalog hotel in the selected destination city
      const newHotel = catalog.find((c) => c.cityId === newCityId)
      if (!newHotel) {
        console.warn(`[AccommodationsEditor] No hotel found for cityId ${newCityId}`)
        return
      }

      // Replace stay options with default hotel in the new destination
      const newOptions: AccommodationOptionItem[] = [
        {
          property: newHotel.id,
          roomCategory: '',
          boardBasis: 'bed_and_breakfast',
          pricingUnit: 'per_stay',
          isDefault: true,
          roomRates: cloneRates(),
        },
      ]

      const updated = normalizedStays.map((s, idx) =>
        idx === stayIdx ? { ...s, options: newOptions } : s,
      )
      updateAccommodations(updated)
    },
    [catalog, normalizedStays, readOnly, updateAccommodations],
  )

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

      const stay = normalizedStays[stayIdx]
      const existingPropIds = new Set(stay.options.map((o) => getPropertyId(o.property)))

      // Resolve destination city for this stay
      const defaultOption = stay.options.find((o) => o.isDefault) || stay.options[0]
      const currentPropId = defaultOption ? getPropertyId(defaultOption.property) : 0
      const currentHotel = catalog.find((c) => c.id === currentPropId)
      const stayCityId =
        currentHotel?.cityId ||
        destinationStops[stayIdx % (destinationStops.length || 1)]?.id

      // Prefer available hotel in the same destination city
      const sameCityAvailable = catalog.find(
        (c) => c.cityId === stayCityId && !existingPropIds.has(c.id),
      )
      const anyAvailable = catalog.find((c) => !existingPropIds.has(c.id))
      const chosenPropId =
        sameCityAvailable?.id || anyAvailable?.id || currentPropId || catalog[0]?.id || 0

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
    [catalog, destinationStops, drawerSlug, normalizedStays, openModal, readOnly],
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

  const handlePropertySelect = useCallback(
    (selectedId: number, selectedDTO?: CatalogAccommodationDTO) => {
      setDraftOption((prev) => ({ ...prev, property: selectedId }))

      // Retain selected property DTO locally so the active stay card immediately has its metadata
      if (selectedDTO) {
        setCatalog((prev) => {
          if (prev.some((c) => c.id === selectedId)) return prev
          return [...prev, selectedDTO]
        })
      }

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
    (occ: OccupancyType, field: 'rateEGP' | 'enabled', val: number | boolean) => {
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

  // Compute existing property IDs in the active stay (excluding the one currently being edited)
  const currentStayPropertyIds = useMemo(() => {
    if (activeStayIndex === null || !normalizedStays[activeStayIndex]) return []
    const stay = normalizedStays[activeStayIndex]
    return stay.options
      .filter((_, idx) => activeOptionIndex === null || idx !== activeOptionIndex)
      .map((opt) => getPropertyId(opt.property))
  }, [activeOptionIndex, activeStayIndex, normalizedStays])

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="ae-root">
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. Main Header                                                    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="ae-main-header">
        <div className="ae-header-left">
          <div className="ae-header-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
              <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
              <path d="M10 14h4" />
              <path d="M10 18h4" />
            </svg>
          </div>
          <div className="ae-header-text">
            <h2 className="ae-main-title">Accommodations</h2>
            <p className="ae-main-desc">
              Manage the lodging stages for this journey. Each stage represents a stop in a destination
              with one or more accommodation options.
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="ae-btn-primary-add-stay"
            onClick={handleAddStay}
            disabled={catalogLoading}
          >
            <svg
              width="14"
              height="14"
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
            <span>Add Stay</span>
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. Journey Destinations Strip                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {destinationStops.length > 0 ? (
        <div className="ae-destinations-bar">
          <div className="ae-destinations-left">
            <div className="ae-destinations-info">
              <span className="ae-destinations-title">Journey Destinations</span>
              <span className="ae-destinations-sub">These are the cities included in this package.</span>
            </div>

            <div className="ae-destinations-cards">
              {destinationStops.map((stop) => (
                <div key={stop.id} className="ae-dest-card">
                  <div className="ae-dest-pin">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="ae-dest-details">
                    <span className="ae-dest-city">{stop.name}</span>
                    {stop.countryName && <span className="ae-dest-country">{stop.countryName}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ae-destinations-count-pill">
            {destinationStops.length} {destinationStops.length === 1 ? 'destination' : 'destinations'}
          </div>
        </div>
      ) : (
        <Banner type="info">
          Please select an <strong>Origin City</strong> and <strong>Destinations</strong> in the
          Experience sidebar to configure accommodations for this journey.
        </Banner>
      )}

      {/* Warning if journey destinations selected but zero catalog accommodations found */}
      {journeyCityIds.length > 0 && !catalogLoading && catalog.length === 0 && (
        <Banner type="default">
          No accommodations in catalog are currently linked to this journey&apos;s destinations (
          {destinationStops.map((d) => d.name).join(' · ')}). Please create or link accommodations
          for these destinations in the Accommodations catalog.
        </Banner>
      )}

      {/* Error / Validation display */}
      {errorMessage && <Banner type="error">{errorMessage}</Banner>}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. Stays List (Connected via Timeline Rail)                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="ae-stays-timeline-list">
        {normalizedStays.length === 0 ? (
          <div className="ae-empty-stays">
            <div className="ae-empty-stays-info">
              <span className="ae-empty-stays-title">
                No accommodation stay stages configured for this itinerary yet.
              </span>
              <span className="ae-empty-stays-desc">
                Configure sequential lodging stops for travelers across the journey destinations.
              </span>
            </div>
            {!readOnly && (
              <button
                type="button"
                className="ae-btn-primary-add-stay"
                onClick={handleAddStay}
                disabled={catalogLoading}
              >
                <svg
                  width="14"
                  height="14"
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
                <span>Add First Stay</span>
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
              destinationStops={destinationStops}
              readOnly={readOnly}
              onDestinationChange={handleStayDestinationChange}
              onNightsChange={handleNightsChange}
              onMoveStay={handleMoveStay}
              onRemoveStay={handleRemoveStay}
              onOpenAddOption={handleOpenAddOption}
              onOpenEditOption={handleOpenEditOption}
              onRemoveOption={handleRemoveOption}
              onSetDefaultOption={(sIdx, optIdx, e) => {
                e.stopPropagation()
                if (readOnly) return
                const currentStay = normalizedStays[sIdx]
                if (!currentStay) return
                const newOptions = currentStay.options.map((opt, idx) => ({
                  ...opt,
                  isDefault: idx === optIdx,
                }))
                const newStays = normalizedStays.map((s, idx) =>
                  idx === sIdx ? { ...s, options: newOptions } : s,
                )
                updateAccommodations(newStays)
              }}
            />
          ))
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. Side Drawer Workspace                                          */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <AccommodationOptionDrawer
        drawerSlug={drawerSlug}
        activeStayIndex={activeStayIndex}
        activeOptionIndex={activeOptionIndex}
        draftOption={draftOption}
        catalog={catalog}
        journeyCityIds={journeyCityIds}
        destinationStops={destinationStops}
        stayExistingPropertyIds={currentStayPropertyIds}
        readOnly={readOnly}
        drawerError={drawerError}
        onPropertySelect={handlePropertySelect}
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
