'use client'

import React, { useMemo } from 'react'
import type { ListViewClientProps } from 'payload'
import { DefaultListView, useListQuery } from '@payloadcms/ui'
import { TableKpiStrip } from './TableKpiStrip'
import { UniversalAgGrid } from './UniversalAgGrid'
import { QuickFilterDropdown, ResetControl } from './toolbar'
import { experiencesPresentation } from './configs/experiences'
import type { CollectionPresentationConfig, TableMetric, TableFilterOption } from './types'
import './universal-table.css'

const PRESENTATION_REGISTRY: Record<string, CollectionPresentationConfig> = {
  experiences: experiencesPresentation,
}

/**
 * Connected KPI Strip Slot:
 * Computes truthful summary metrics directly from Payload's live ListQuery data.
 */
const TableKpiStripSlot: React.FC<{ presentation: CollectionPresentationConfig }> = ({
  presentation,
}) => {
  const { data } = useListQuery()
  const docs = (data?.docs as any[]) || []
  const totalDocs = Number(data?.totalDocs || 0)

  if (presentation.capabilities?.metrics === false || totalDocs === 0) {
    return null
  }

  const pageAvailable = docs.filter(
    (d) => d.availability === 'available' || d.availability === true
  ).length

  const pageUnavailable = docs.filter(
    (d) => d.availability === 'unavailable' || d.availability === false
  ).length

  const metrics: TableMetric[] = [
    {
      id: 'total',
      label: `Total ${presentation.title || 'Records'}`,
      value: totalDocs,
      icon: 'bag',
    },
    {
      id: 'available',
      label: 'Page Available',
      value: pageAvailable,
      percentage:
        docs.length > 0 ? Math.round((pageAvailable / docs.length) * 100) : 100,
      icon: 'check',
      variant: 'success',
    },
    {
      id: 'unavailable',
      label: 'Page Unavailable',
      value: pageUnavailable,
      percentage:
        docs.length > 0 ? Math.round((pageUnavailable / docs.length) * 100) : 0,
      icon: 'alert',
      variant: 'warning',
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
 *
 * Visual Customization:
 * - beforeActions: Injected QuickFilter dropdowns (City, Type, Availability) + Reset button directly inside the toolbar
 * - BeforeListTable: KPI summary cards
 * - Table: Luxury UniversalAgGrid
 * - universal-table.css: Scoped luxury styling for ListControls, SearchBar, Pills, and Drawers
 */
export const UniversalListView: React.FC<ListViewClientProps> = (props) => {
  const { collectionSlug } = props
  const presentation = PRESENTATION_REGISTRY[collectionSlug]

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
        Table={<UniversalAgGrid presentation={presentation} />}
      />
    </div>
  )
}
