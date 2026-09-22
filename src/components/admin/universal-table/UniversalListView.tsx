'use client'

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import type { ListViewClientProps } from 'payload'
import { DefaultListView, useListQuery, usePreferences, useConfig } from '@payloadcms/ui'
import { TableKpiStrip } from './TableKpiStrip'
import { UniversalAgGrid, type UniversalAgGridRef } from './UniversalAgGrid'
import { QuickFilterDropdown, ResetControl, DensitySwitcher } from './toolbar'
import { experiencesPresentation } from './configs/experiences'
import { bookingsPresentation } from './configs/bookings'
import { PeekDrawer, DocumentDrawerBridge } from './drawer'
import type { CollectionPresentationConfig, TableMetric, TableFilterOption, DensityMode } from './types'
import './universal-table.css'

const PRESENTATION_REGISTRY: Record<string, CollectionPresentationConfig> = {
  experiences: experiencesPresentation,
  bookings: bookingsPresentation,
}

const DEFAULT_DENSITY: DensityMode = 'comfortable'

/**
 * Connected KPI Strip Slot:
 * Computes truthful summary metrics directly from Payload's live ListQuery data.
 * Features 1-click interactive query shortcuts directly into useListQuery.
 */
const TableKpiStripSlot: React.FC<{ presentation: CollectionPresentationConfig }> = ({
  presentation,
}) => {
  const { data, refineListData } = useListQuery()
  const docs = (data?.docs as any[]) || []
  const totalDocs = Number(data?.totalDocs || 0)

  if (presentation.capabilities?.metrics === false || totalDocs === 0) {
    return null
  }

  const isBookings = presentation.collectionSlug === 'bookings'

  if (isBookings) {
    const pendingReviewCount = docs.filter((d) => d.status === 'pending_admin_review').length
    const confirmedCount = docs.filter((d) => d.status === 'confirmed').length
    const pendingPaymentCount = docs.filter((d) => d.status === 'pending_payment').length

    const metrics: TableMetric[] = [
      {
        id: 'total',
        label: 'Total Bookings',
        value: totalDocs,
        icon: 'bag',
        onClick: () => refineListData({ where: undefined, page: 1 }),
      },
      {
        id: 'pending_review',
        label: 'Pending Review',
        value: pendingReviewCount,
        icon: 'alert',
        variant: 'warning',
        onClick: () =>
          refineListData({
            where: { status: { equals: 'pending_admin_review' } },
            page: 1,
          }),
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        value: confirmedCount,
        icon: 'check',
        variant: 'success',
        onClick: () =>
          refineListData({
            where: { status: { equals: 'confirmed' } },
            page: 1,
          }),
      },
      {
        id: 'pending_payment',
        label: 'Pending Payment',
        value: pendingPaymentCount,
        icon: 'pin',
        variant: 'info',
        onClick: () =>
          refineListData({
            where: { status: { equals: 'pending_payment' } },
            page: 1,
          }),
      },
    ]

    return <TableKpiStrip metrics={metrics} />
  }

  // Experiences KPI Strip
  const pageAvailable = docs.filter(
    (d) => d.availability === 'available' || d.availability === true,
  ).length

  const pageUnavailable = docs.filter(
    (d) => d.availability === 'unavailable' || d.availability === false,
  ).length

  const metrics: TableMetric[] = [
    {
      id: 'total',
      label: `Total ${presentation.title || 'Records'}`,
      value: totalDocs,
      icon: 'bag',
      onClick: () => refineListData({ where: undefined, page: 1 }),
    },
    {
      id: 'available',
      label: 'Page Available',
      value: pageAvailable,
      percentage:
        docs.length > 0 ? Math.round((pageAvailable / docs.length) * 100) : 100,
      icon: 'check',
      variant: 'success',
      onClick: () =>
        refineListData({
          where: { availability: { equals: 'available' } },
          page: 1,
        }),
    },
    {
      id: 'unavailable',
      label: 'Page Unavailable',
      value: pageUnavailable,
      percentage:
        docs.length > 0 ? Math.round((pageUnavailable / docs.length) * 100) : 0,
      icon: 'alert',
      variant: 'warning',
      onClick: () =>
        refineListData({
          where: { availability: { equals: 'unavailable' } },
          page: 1,
        }),
    },
  ]

  return <TableKpiStrip metrics={metrics} />
}

/**
 * Universal Collection View Adapter:
 * Uses Payload's native DefaultListView and ListControls to preserve 100% of Payload's native behavior:
 * - Native SearchBar (debounced, URL synced, accessible, translated placeholder)
 * - Native Columns Pill & ColumnSelector (reorder, toggle, active state via useTableColumns)
 * - Native Filters Pill & WhereBuilder (filters, operators, conditions via useListQuery)
 * - Native Pagination, Breadcrumbs, and Permissions
 * - Native Query Presets (when enabled on collection config)
 *
 * Visual & Operational Enhancements:
 * - beforeActions: Injected QuickFilter dropdowns + DensitySwitcher + Reset button
 * - BeforeListTable: Interactive KPI summary cards with query shortcuts
 * - Table: Luxury UniversalAgGrid with single-click inspection & in-place update
 * - PeekDrawer: Read-only operational inspection side panel (Editorial Mixed-Surface)
 * - DocumentDrawerBridge: Official Payload DocumentDrawer with 100% context preservation
 */
export const UniversalListView: React.FC<ListViewClientProps> = (props) => {
  const { collectionSlug } = props
  const presentation = PRESENTATION_REGISTRY[collectionSlug]

  const { config } = useConfig()
  const apiRoute = config?.routes?.api || '/api'
  const { getPreference, setPreference } = usePreferences()
  const densityPrefKey = `universal-grid-density:${collectionSlug}`

  const gridRef = useRef<UniversalAgGridRef>(null)
  const [peekState, setPeekState] = useState<{ id: string | number; initialRow: any } | null>(null)
  const [editDocId, setEditDocId] = useState<string | number | null>(null)
  const [density, setDensity] = useState<DensityMode>(DEFAULT_DENSITY)

  // Load density preference on mount without writing default to DB
  useEffect(() => {
    let isMounted = true
    getPreference<DensityMode>(densityPrefKey)
      .then((res: any) => {
        if (isMounted && (res === 'comfortable' || res === 'compact' || res === 'dense')) {
          setDensity(res as DensityMode)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [getPreference, densityPrefKey])

  const handleDensityChange = useCallback(
    (newDensity: DensityMode) => {
      setDensity(newDensity)
      setPreference(densityPrefKey, newDensity).catch(() => {})
    },
    [setPreference, densityPrefKey],
  )

  const handleRowClick = useCallback((docId: string | number, rowData: any) => {
    setPeekState({ id: docId, initialRow: rowData })
  }, [])

  const handleClosePeek = useCallback(() => {
    setPeekState(null)
  }, [])

  const handleOpenEditDrawer = useCallback((id: string | number) => {
    setEditDocId(id)
  }, [])

  const handleDocumentSave = useCallback((savedDoc: any) => {
    if (!savedDoc) return
    // 1. In-place grid row update with exact row schema conformance
    gridRef.current?.updateRow(savedDoc)

    // 2. Sync active peek state if viewing the same document
    setPeekState((prev) => {
      if (prev && String(prev.id) === String(savedDoc.id)) {
        return {
          ...prev,
          initialRow: { ...prev.initialRow, ...savedDoc },
        }
      }
      return prev
    })
  }, [])

  // Bounded Authoritative Re-read on Drawer Close:
  // If a standalone server action (e.g. confirmAdminBookingAction or cancelAdminBookingAction)
  // modified the record without triggering Payload form's onSave callback,
  // fetch the fresh authoritative document directly from Payload's REST API.
  const handleCloseEditDrawer = useCallback(() => {
    const closingId = editDocId
    setEditDocId(null)

    if (closingId != null) {
      fetch(`${apiRoute}/${collectionSlug}/${closingId}?depth=1`)
        .then((res) => (res.ok ? res.json() : null))
        .then((freshDoc) => {
          if (freshDoc && freshDoc.id) {
            handleDocumentSave(freshDoc)
          }
        })
        .catch(() => {})
    }
  }, [apiRoute, collectionSlug, editDocId, handleDocumentSave])

  const mappedResolvedOptions = useMemo<Record<string, TableFilterOption[]>>(() => {
    const result: Record<string, TableFilterOption[]> = {}
    if (props.resolvedFilterOptions instanceof Map) {
      props.resolvedFilterOptions.forEach((val, key) => {
        if (Array.isArray(val)) {
          result[key] = val
        }
      })
    } else if (props.resolvedFilterOptions && typeof props.resolvedFilterOptions === 'object') {
      Object.entries(props.resolvedFilterOptions).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          result[key] = val as any
        }
      })
    }
    return result
  }, [props.resolvedFilterOptions])

  if (!presentation) {
    return <DefaultListView {...props} />
  }

  const quickFilters = presentation.toolbar?.quickFilters || []
  const hasQuickFilters = presentation.toolbar?.capabilities?.quickFilters !== false && quickFilters.length > 0
  const hasReset = presentation.toolbar?.capabilities?.reset !== false

  const quickFilterActions: React.ReactNode[] = []
  if (hasQuickFilters) {
    quickFilterActions.push(
      <div key="ut-quick-filters" className="ut-quick-filters-actions flex items-center gap-2">
        {quickFilters.map((filter) => (
          <QuickFilterDropdown
            key={filter.id}
            filter={filter}
            collectionSlug={collectionSlug}
            resolvedOptions={mappedResolvedOptions[filter.field]}
          />
        ))}
      </div>,
    )
  }
  if (hasReset) {
    quickFilterActions.push(<ResetControl key="ut-reset-control" />)
  }

  const combinedBeforeActions: React.ReactNode[] = [
    ...quickFilterActions,
    <DensitySwitcher key="ut-density-switcher" value={density} onChange={handleDensityChange} />,
    ...(Array.isArray(props.beforeActions) ? props.beforeActions : []),
  ]

  return (
    <div className="universal-table-root w-full">
      <DefaultListView
        {...props}
        beforeActions={combinedBeforeActions.length > 0 ? combinedBeforeActions : undefined}
        BeforeListTable={
          <>
            {props.BeforeListTable}
            <TableKpiStripSlot presentation={presentation} />
          </>
        }
        Table={
          <UniversalAgGrid
            ref={gridRef}
            presentation={presentation}
            density={density}
            onRowClick={handleRowClick}
          />
        }
      />

      {/* Editorial Mixed-Surface Peek Drawer */}
      <PeekDrawer
        collectionSlug={collectionSlug}
        docId={peekState?.id ?? null}
        initialRow={peekState?.initialRow}
        onClose={handleClosePeek}
        onOpenEditDrawer={handleOpenEditDrawer}
      />

      {/* Official Payload Document Drawer Bridge */}
      <DocumentDrawerBridge
        collectionSlug={collectionSlug}
        docId={editDocId}
        onSave={handleDocumentSave}
        onClose={handleCloseEditDrawer}
      />
    </div>
  )
}

