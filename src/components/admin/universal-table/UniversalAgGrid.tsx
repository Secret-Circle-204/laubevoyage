'use client'

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeDark,
  type ColDef,
  type SortChangedEvent,
  type ColumnMovedEvent,
  type ColumnResizedEvent,
  type GridReadyEvent,
  type GridApi,
} from 'ag-grid-community'
import { useListQuery, useSelection, useTableColumns, usePreferences } from '@payloadcms/ui'
import type { CollectionPresentationConfig } from './types'
import {
  ThumbnailCell,
  TitleSubtitleCell,
  LocationCell,
  BadgeCell,
  PriceCell,
  DateCell,
  TextCell,
  ActionsCell,
  AccommodationsCell,
  ItineraryCell,
  GalleryCell,
} from './cells'

// Register all official AG Grid Community modules (36.2.0)
ModuleRegistry.registerModules([AllCommunityModule])

// Scoped Dark Luxury Quartz Theme for L'Aube Voyage Admin
export const luxuryAgGridTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: '#0c1322',
  foregroundColor: '#f8fafc',
  headerBackgroundColor: '#0f172a',
  headerTextColor: '#94a3b8',
  borderColor: 'rgba(51, 65, 85, 0.45)',
  rowBorder: { color: 'rgba(51, 65, 85, 0.22)' },
  rowHoverColor: 'rgba(30, 41, 59, 0.65)',
  selectedRowBackgroundColor: 'rgba(245, 158, 11, 0.08)',
  accentColor: '#f59e0b',
  fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
  fontSize: 13,
  headerFontSize: 11,
  rowHeight: 64,
  headerHeight: 44,
  cellHorizontalPadding: 16,
})

const CELL_COMPONENT_MAP = {
  thumbnail: ThumbnailCell,
  title: TitleSubtitleCell,
  location: LocationCell,
  badge: BadgeCell,
  price: PriceCell,
  date: DateCell,
  text: TextCell,
  accommodations: AccommodationsCell,
  itinerary: ItineraryCell,
  gallery: GalleryCell,
} as const

function formatHeaderName(accessor: string): string {
  if (!accessor || typeof accessor !== 'string') return ''
  const clean = accessor.replace(/^_+/, '')
  return clean
    .replace(/([A-Z])/g, ' $1')
    .replace(/[\._\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

/**
 * Isolated Selection Header:
 * Renders select-all checkbox internally connected to Payload useSelection().
 * Does NOT cause columnDefs to re-evaluate on selection changes.
 */
const SelectionHeaderComponent: React.FC = () => {
  const { selectAll, toggleAll } = useSelection()
  return (
    <div className="flex items-center justify-center w-full h-full">
      <input
        type="checkbox"
        checked={selectAll === 'allInPage' || selectAll === 'allAvailable'}
        ref={(el) => {
          if (el) el.indeterminate = selectAll === 'some'
        }}
        onChange={() => {
          if (typeof toggleAll === 'function') toggleAll()
        }}
        className="ut-checkbox"
        title="Select All"
      />
    </div>
  )
}

/**
 * Isolated Selection Cell:
 * Renders row checkbox internally connected to Payload useSelection().
 * Prevents full grid reconstruction when rows are selected.
 */
const SelectionCellComponent: React.FC<{ rowId: string | number }> = ({ rowId }) => {
  const { selected, setSelection } = useSelection()
  const isSelected = Boolean(selected?.get(rowId))
  return (
    <div className="flex items-center justify-center w-full h-full">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation()
          if (typeof setSelection === 'function' && rowId != null) {
            setSelection(rowId)
          }
        }}
        className="ut-checkbox"
      />
    </div>
  )
}

interface UniversalAgGridProps {
  presentation: CollectionPresentationConfig
}

export const UniversalAgGrid: React.FC<UniversalAgGridProps> = ({ presentation }) => {
  const { data, query, handleSortChange } = useListQuery()
  const { columns: payloadColumns, moveColumn } = useTableColumns()
  const { getPreference, setPreference } = usePreferences()

  const gridApiRef = useRef<GridApi | null>(null)
  const isSyncingSortRef = useRef(false)
  const isMovingColumnRef = useRef(false)
  const isInitialFitDoneRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [savedWidths, setSavedWidths] = useState<Record<string, number> | null>(null)
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false)

  const docs = (data?.docs as any[]) || []
  const collectionSlug = presentation.collectionSlug
  const preferenceKey = `universal-grid-widths:${collectionSlug}`

  // 1. Fetch saved column widths from Payload's native usePreferences
  useEffect(() => {
    let isMounted = true
    getPreference<Record<string, number>>(preferenceKey)
      .then((res) => {
        if (isMounted) {
          setSavedWidths(res && typeof res === 'object' && Object.keys(res).length > 0 ? res : null)
          setIsPreferencesLoaded(true)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSavedWidths(null)
          setIsPreferencesLoaded(true)
        }
      })
    return () => {
      isMounted = false
    }
  }, [getPreference, preferenceKey])

  // 2. Determine active columns from Payload useTableColumns() as single source of truth
  const activePayloadColumns = useMemo(() => {
    if (Array.isArray(payloadColumns) && payloadColumns.length > 0) {
      return payloadColumns.filter((c) => {
        if (!c || !c.active) return false
        if (typeof c.accessor !== 'string') return false
        const acc = c.accessor.trim()
        if (!acc) return false
        if (acc.startsWith('_')) return false
        if (acc === 'actions' || acc === 'select') return false
        return true
      })
    }
    return []
  }, [payloadColumns])

  // 3. Build ColDefs dynamically from Payload's active column state + Presentation Overrides.
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = []

    // A. Single Controlled Selection Checkbox Column: Locked to far left
    if (presentation.capabilities?.selection !== false) {
      cols.push({
        colId: '__selection',
        headerName: '',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        resizable: false,
        sortable: false,
        suppressMovable: true,
        lockPosition: 'left',
        pinned: 'left',
        headerComponent: SelectionHeaderComponent,
        cellRenderer: (params: any) => <SelectionCellComponent rowId={params.data?.id} />,
      })
    }

    // B. Map Payload Active Columns to AG Grid ColDefs (All Movable and Resizable)
    activePayloadColumns.forEach((payloadCol) => {
      const accessor = payloadCol.accessor
      const override = presentation.overrides?.[accessor]

      // Extract high-fidelity header label with multi-level fallback
      let headerText = override?.header
      if (!headerText) {
        if (typeof payloadCol.Heading === 'string' && payloadCol.Heading.trim()) {
          headerText = payloadCol.Heading.trim()
        } else if (
          payloadCol.field &&
          typeof (payloadCol.field as any).label === 'string' &&
          (payloadCol.field as any).label.trim()
        ) {
          headerText = (payloadCol.field as any).label.trim()
        } else {
          headerText = formatHeaderName(accessor)
        }
      }
      if (!headerText) {
        headerText = formatHeaderName(accessor) || accessor
      }

      const cellType = override?.cellType || 'text'
      const CellComponent = CELL_COMPONENT_MAP[cellType] || TextCell

      const colDef: ColDef = {
        colId: accessor,
        field: accessor,
        headerName: headerText,
        initialWidth:
          override?.width ||
          (override?.flex ? Math.round(override.flex * 140) : 150),
        minWidth: override?.minWidth || 80,
        maxWidth: override?.maxWidth,
        resizable: override?.resizable !== false,
        sortable: override?.sortable !== false,
        suppressMovable: false,
        unSortIcon: true,
        // Controlled server sorting comparator: returns 0 so AG Grid does NOT reorder rows locally
        comparator: () => 0,
        valueFormatter: (params: any) => {
          if (params.value == null) return ''
          if (accessor === 'accommodations' && Array.isArray(params.value)) {
            const totalNts = params.value.reduce((s: number, stay: any) => s + (Number(stay?.nights) || 0), 0)
            return `${params.value.length} Stays (${totalNts} nts)`
          }
          if (accessor === 'itinerary' && Array.isArray(params.value)) {
            return `${params.value.length} Days`
          }
          if (accessor === 'gallery' && Array.isArray(params.value)) {
            return `${params.value.length} Photos`
          }
          if (Array.isArray(params.value)) {
            return `${params.value.length} items`
          }
          if (typeof params.value === 'object') {
            return params.value.name || params.value.title || params.value.id || ''
          }
          return String(params.value)
        },
        cellRenderer: (params: any) => (
          <CellComponent row={params.data} value={params.value} field={accessor} />
        ),
      }

      cols.push(colDef)
    })

    // C. Fixed Row Actions Column: Pinned and locked to far right, with "Actions" header title
    if (presentation.rowActions && presentation.rowActions.length > 0) {
      cols.push({
        colId: '__actions',
        headerName: 'Actions',
        width: 90,
        minWidth: 80,
        maxWidth: 100,
        resizable: false,
        sortable: false,
        suppressMovable: true,
        lockPosition: 'right',
        pinned: 'right',
        cellRenderer: (params: any) => (
          <ActionsCell
            row={params.data}
            actions={presentation.rowActions}
            collectionSlug={collectionSlug}
          />
        ),
      })
    }

    return cols
  }, [activePayloadColumns, presentation, collectionSlug])

  // Default ColDef for independent, user-resizable columns
  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      minWidth: 80,
      valueFormatter: (params) => {
        if (params.value == null) return ''
        if (Array.isArray(params.value)) return `${params.value.length} items`
        if (typeof params.value === 'object') return params.value.name || params.value.title || params.value.id || ''
        return String(params.value)
      },
    }),
    [],
  )

  // Extract active sort string directly without manual memoization mismatch
  const querySort = query?.sort
  const activeSortStr = Array.isArray(querySort)
    ? querySort[0] || ''
    : typeof querySort === 'string'
      ? querySort
      : ''

  // 4. Apply saved preferences or perform one-time initial fit once preferences load
  useEffect(() => {
    if (!isPreferencesLoaded || !gridApiRef.current) return
    const api = gridApiRef.current

    if (savedWidths && Object.keys(savedWidths).length > 0) {
      const state = Object.entries(savedWidths).map(([colId, width]) => ({
        colId,
        width,
      }))
      api.applyColumnState({ state, applyOrder: false })
    } else if (!isInitialFitDoneRef.current) {
      if (typeof api.sizeColumnsToFit === 'function') {
        api.sizeColumnsToFit()
        isInitialFitDoneRef.current = true
      }
    }
  }, [isPreferencesLoaded, savedWidths])

  // 5. Grid Ready Handler
  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      gridApiRef.current = event.api

      if (isPreferencesLoaded) {
        if (savedWidths && Object.keys(savedWidths).length > 0) {
          const state = Object.entries(savedWidths).map(([colId, width]) => ({
            colId,
            width,
          }))
          event.api.applyColumnState({ state, applyOrder: false })
        } else if (!isInitialFitDoneRef.current) {
          if (typeof event.api.sizeColumnsToFit === 'function') {
            event.api.sizeColumnsToFit()
            isInitialFitDoneRef.current = true
          }
        }
      }

      // Sync initial sort state from Payload query.sort without altering column order
      if (activeSortStr && typeof event.api.applyColumnState === 'function') {
        const isDesc = activeSortStr.startsWith('-')
        const colId = isDesc ? activeSortStr.substring(1) : activeSortStr
        isSyncingSortRef.current = true
        event.api.applyColumnState({
          state: [{ colId, sort: isDesc ? 'desc' : 'asc' }],
          defaultState: { sort: null },
          applyOrder: false,
        })
        isSyncingSortRef.current = false
      }
    },
    [activeSortStr, isPreferencesLoaded, savedWidths],
  )

  // 6. Synchronize sort indicator when Payload query.sort changes from outside
  useEffect(() => {
    const api = gridApiRef.current
    if (!api || typeof api.applyColumnState !== 'function') return

    isSyncingSortRef.current = true
    if (!activeSortStr) {
      api.applyColumnState({ defaultState: { sort: null }, applyOrder: false })
    } else {
      const isDesc = activeSortStr.startsWith('-')
      const colId = isDesc ? activeSortStr.substring(1) : activeSortStr
      api.applyColumnState({
        state: [{ colId, sort: isDesc ? 'desc' : 'asc' }],
        defaultState: { sort: null },
        applyOrder: false,
      })
    }
    isSyncingSortRef.current = false
  }, [activeSortStr])

  // 7. Controlled Server Sorting Bridge: Emits sort field to Payload handleSortChange
  const onSortChanged = useCallback(
    (event: SortChangedEvent) => {
      if (isSyncingSortRef.current) return
      if (!event.api || typeof event.api.getColumnState !== 'function') return

      const colStates = event.api.getColumnState() || []
      const sortedCol = colStates.find((c) => c.sort != null)

      if (sortedCol && sortedCol.colId && !sortedCol.colId.startsWith('__')) {
        const newSort = sortedCol.sort === 'desc' ? `-${sortedCol.colId}` : sortedCol.colId
        if (activeSortStr !== newSort && typeof handleSortChange === 'function') {
          handleSortChange(newSort)
        }
      } else if (!sortedCol && activeSortStr && typeof handleSortChange === 'function') {
        handleSortChange('')
      }
    },
    [handleSortChange, activeSortStr],
  )

  // 8. Direct Column Reorder Sync with Payload useTableColumns().moveColumn
  const onColumnMoved = useCallback(
    (event: ColumnMovedEvent) => {
      // Only process when user has actually dropped the column
      if (!event.finished) return
      if (!event.api || typeof event.api.getAllGridColumns !== 'function') return
      if (typeof moveColumn !== 'function') return
      if (isMovingColumnRef.current) return

      const movedColId = event.column?.getColId()
      if (!movedColId || movedColId.startsWith('__')) return

      // 1. Get exact visual sequence of active data columns from AG Grid
      const gridCols = event.api
        .getAllGridColumns()
        .map((c) => c.getColId())
        .filter((id) => !id.startsWith('__'))

      const newGridIdx = gridCols.indexOf(movedColId)
      if (newGridIdx < 0) return

      const currentColumns = Array.isArray(payloadColumns) ? payloadColumns : []
      const fromIndex = currentColumns.findIndex((c) => c.accessor === movedColId)
      if (fromIndex < 0) return

      // 2. Calculate exact toIndex in Payload's full column array
      let toIndex = -1
      if (newGridIdx === 0) {
        // Moved to first visible position: place before the first OTHER active column
        const firstOtherActiveIdx = currentColumns.findIndex(
          (c) => c.active && c.accessor !== movedColId,
        )
        toIndex = firstOtherActiveIdx >= 0 ? firstOtherActiveIdx : 0
      } else {
        // Moved after previous visible column
        const prevColId = gridCols[newGridIdx - 1]
        const prevPayloadIdx = currentColumns.findIndex((c) => c.accessor === prevColId)
        if (prevPayloadIdx >= 0) {
          toIndex = fromIndex < prevPayloadIdx ? prevPayloadIdx : prevPayloadIdx + 1
        }
      }

      // 3. Dispatch to Payload immediately without timeout hacks
      if (toIndex >= 0 && fromIndex !== toIndex) {
        isMovingColumnRef.current = true
        Promise.resolve(moveColumn({ fromIndex, toIndex }))
          .catch(() => {})
          .finally(() => {
            isMovingColumnRef.current = false
          })
      }
    },
    [moveColumn, payloadColumns],
  )

  // 9. Save user-resized column widths natively to Payload usePreferences (Debounced)
  const onColumnResized = useCallback(
    (event: ColumnResizedEvent) => {
      if (!event.finished || event.source !== 'uiColumnResized') return
      if (!event.api || typeof event.api.getAllGridColumns !== 'function') return

      const allCols = event.api.getAllGridColumns()
      const newWidths: Record<string, number> = {}
      allCols.forEach((col) => {
        const id = col.getColId()
        if (id && !id.startsWith('__')) {
          newWidths[id] = col.getActualWidth()
        }
      })

      setSavedWidths(newWidths)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        setPreference(preferenceKey, newWidths).catch(() => {})
      }, 300)
    },
    [preferenceKey, setPreference],
  )

  // 10. Reset Column Widths: Clears preference and performs one-time clean balanced fit
  const handleResetWidths = useCallback(() => {
    setSavedWidths(null)
    setPreference(preferenceKey, null).catch(() => {})
    if (gridApiRef.current) {
      gridApiRef.current.resetColumnState()
      if (typeof gridApiRef.current.sizeColumnsToFit === 'function') {
        gridApiRef.current.sizeColumnsToFit()
      }
    }
  }, [preferenceKey, setPreference])

  return (
    <div className="ut-card ut-grid-card my-3 w-full overflow-hidden flex flex-col">
      {savedWidths && Object.keys(savedWidths).length > 0 && (
        <div className="flex justify-end pt-2 px-3 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetWidths}
            className="text-xs text-amber-500/80 hover:text-amber-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-900/60 px-2.5 py-1 rounded border border-slate-700/50"
            title="Reset column widths to default balanced layout"
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
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset Column Widths
          </button>
        </div>
      )}
      <div className="ut-grid-viewport flex-1 w-full min-w-0" style={{ height: 560, minHeight: 480 }}>
        <AgGridReact
          theme={luxuryAgGridTheme}
          rowData={docs}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onSortChanged={onSortChanged}
          onColumnMoved={onColumnMoved}
          onColumnResized={onColumnResized}
          domLayout="normal"
          suppressCellFocus={true}
          animateRows={true}
          suppressMovableColumns={false}
          suppressDragLeaveHidesColumns={true}
        />
      </div>
    </div>
  )
}
