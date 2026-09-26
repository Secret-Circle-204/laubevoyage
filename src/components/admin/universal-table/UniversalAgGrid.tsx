'use client'

import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { AgGridReact, type CustomCellRendererProps } from 'ag-grid-react'
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
  type CellClickedEvent,
  type ValueFormatterParams,
} from 'ag-grid-community'
import { useListQuery, useSelection, useTableColumns, usePreferences, DefaultCell } from '@payloadcms/ui'
import type { CollectionPresentationConfig, DensityMode, TableCellProps, TableCellType } from './types'
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

// Scoped Luxury Quartz Theme with Brand #2E3191 for L'Aube Voyage Admin
export const luxuryAgGridTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: '#2E3191',
  foregroundColor: '#ffffff',
  headerBackgroundColor: '#232573',
  headerTextColor: '#f8fafc',
  borderColor: 'rgba(255, 255, 255, 0.15)',
  rowBorder: { color: 'rgba(255, 255, 255, 0.1)' },
  rowHoverColor: 'rgba(255, 255, 255, 0.14)',
  selectedRowBackgroundColor: 'rgba(245, 158, 11, 0.24)',
  accentColor: '#f59e0b',
  fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
  fontSize: 13,
  headerFontSize: 11,
  rowHeight: 64,
  headerHeight: 44,
  cellHorizontalPadding: 16,
})

const CELL_COMPONENT_MAP: Partial<Record<TableCellType, React.FC<TableCellProps>>> = {
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
}

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

export interface UniversalAgGridRef {
  updateRow: (doc: Record<string, unknown>) => void
  resetWidths?: () => void
}

export interface UniversalAgGridProps {
  presentation: CollectionPresentationConfig
  onRowClick?: (docId: string | number, rowData: Record<string, unknown>) => void
  density?: DensityMode
}

export const UniversalAgGrid = forwardRef<UniversalAgGridRef, UniversalAgGridProps>(
  ({ presentation, onRowClick, density = 'comfortable' }, ref) => {
  const { data, query, handleSortChange } = useListQuery()
  const { columns: payloadColumns } = useTableColumns()
  const { getPreference, setPreference } = usePreferences()

  const rowHeight = density === 'dense' ? 36 : density === 'compact' ? 48 : 64
  const headerHeight = density === 'dense' ? 38 : density === 'compact' ? 42 : 46

  const gridApiRef = useRef<GridApi | null>(null)
  const isSyncingSortRef = useRef(false)
  const isInitialFitDoneRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [savedWidths, setSavedWidths] = useState<Record<string, number> | null>(null)
  const [savedColOrder, setSavedColOrder] = useState<string[] | null>(null)
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false)

  const docs = (data?.docs as Record<string, unknown>[]) || []
  const collectionSlug = presentation.collectionSlug
  const widthsPreferenceKey = `universal-grid-widths:${collectionSlug}`
  const orderPreferenceKey = `universal-grid-columns:${collectionSlug}`

  // 1. Fetch saved column widths and user column order from Payload's native usePreferences
  useEffect(() => {
    let isMounted = true
    Promise.all([
      getPreference<Record<string, number>>(widthsPreferenceKey).catch((err) => {
        console.error(`[UniversalAgGrid] Failed to load widths preference for ${widthsPreferenceKey}:`, err)
        return null
      }),
      getPreference<string[]>(orderPreferenceKey).catch((err) => {
        console.error(`[UniversalAgGrid] Failed to load column order preference for ${orderPreferenceKey}:`, err)
        return null
      }),
    ])
      .then(([widthsRes, orderRes]) => {
        if (isMounted) {
          setSavedWidths(
            widthsRes && typeof widthsRes === 'object' && Object.keys(widthsRes).length > 0
              ? widthsRes
              : null,
          )
          setSavedColOrder(
            Array.isArray(orderRes) && orderRes.length > 0 ? (orderRes as string[]) : null,
          )
          setIsPreferencesLoaded(true)
        }
      })
      .catch((err) => {
        console.error(`[UniversalAgGrid] Unexpected error loading preferences for ${collectionSlug}:`, err)
        if (isMounted) {
          setSavedWidths(null)
          setSavedColOrder(null)
          setIsPreferencesLoaded(true)
        }
      })
    return () => {
      isMounted = false
    }
  }, [getPreference, widthsPreferenceKey, orderPreferenceKey])

  // 2. Determine active columns from Payload useTableColumns() and order by user preferences
  const activePayloadColumns = useMemo(() => {
    if (Array.isArray(payloadColumns) && payloadColumns.length > 0) {
      const active = payloadColumns.filter((c) => {
        if (!c || !c.active) return false
        if (typeof c.accessor !== 'string') return false
        const acc = c.accessor.trim()
        if (!acc) return false
        if (acc.startsWith('_')) return false
        if (acc === 'actions' || acc === 'select') return false
        return true
      })

      if (!savedColOrder || savedColOrder.length === 0) return active

      const colMap = new Map(active.map((col) => [col.accessor, col]))
      const ordered: typeof active = []
      for (const acc of savedColOrder) {
        const col = colMap.get(acc)
        if (col) {
          ordered.push(col)
          colMap.delete(acc)
        }
      }
      for (const remaining of colMap.values()) {
        ordered.push(remaining)
      }
      return ordered
    }
    return []
  }, [payloadColumns, savedColOrder])

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
        cellRenderer: (params: CustomCellRendererProps) => <SelectionCellComponent rowId={params.data?.id} />,
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
          'label' in payloadCol.field &&
          typeof payloadCol.field.label === 'string' &&
          payloadCol.field.label.trim()
        ) {
          headerText = payloadCol.field.label.trim()
        } else {
          headerText = formatHeaderName(accessor)
        }
      }
      if (!headerText) {
        headerText = formatHeaderName(accessor) || accessor
      }

      const cellType = override?.cellType || 'text'
      const fieldType = payloadCol.field && 'type' in payloadCol.field ? payloadCol.field.type : undefined
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
        valueFormatter: (params: ValueFormatterParams) => {
          if (params.value == null) return ''
          // 1. Column presentation override formatter (configured in presentation.overrides)
          if (typeof override?.valueFormatter === 'function') {
            return override.valueFormatter(params.value, params.data)
          }
          // 2. Generic fallback formatters
          if (Array.isArray(params.value)) {
            return `${params.value.length} items`
          }
          if (typeof params.value === 'object') {
            const obj = params.value as Record<string, unknown>
            return String(obj.name || obj.title || obj.id || '')
          }
          return String(params.value)
        },
        cellRenderer: (params: CustomCellRendererProps) => {
          // 1. Strictly-typed Custom Cell Renderer from Column Presentation Override
          if (override?.customCell) {
            const CustomCellRenderer = override.customCell
            return (
              <CustomCellRenderer
                cellData={params.value}
                rowData={params.data}
                field={payloadCol.field}
                collectionSlug={collectionSlug}
              />
            )
          }

          // 2. Official Payload Relationship Cell
          if (cellType === 'relationship' || fieldType === 'relationship') {
            return (
              <DefaultCell
                cellData={params.value}
                rowData={params.data}
                field={payloadCol.field}
                collectionSlug={collectionSlug}
              />
            )
          }

          // 3. Generic Built-in Universal Cell
          return (
            <CellComponent
              row={params.data}
              value={params.value}
              field={accessor}
              collectionSlug={collectionSlug}
            />
          )
        },
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
        cellRenderer: (params: CustomCellRendererProps) => (
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
      valueFormatter: (params: ValueFormatterParams) => {
        if (params.value == null) return ''
        if (Array.isArray(params.value)) return `${params.value.length} items`
        if (typeof params.value === 'object') {
          const obj = params.value as Record<string, unknown>
          return String(obj.name || obj.title || obj.id || '')
        }
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

  // 8. User Column Reorder Persisted via Payload usePreferences (Zero URL serialization)
  const onColumnMoved = useCallback(
    (event: ColumnMovedEvent) => {
      // Only process when user has actually dropped the column manually in the UI
      if (!event.finished || event.source !== 'uiColumnDragged') return
      if (!event.api || typeof event.api.getAllGridColumns !== 'function') return

      const movedColId = event.column?.getColId()
      if (!movedColId || movedColId.startsWith('__')) return

      // Get visual sequence of active data columns from AG Grid
      const gridCols = event.api
        .getAllGridColumns()
        .map((c) => c.getColId())
        .filter((id) => !id.startsWith('__'))

      if (gridCols.length > 0) {
        setSavedColOrder(gridCols)
        setPreference(orderPreferenceKey, gridCols).catch((err) => {
          console.error(`[UniversalAgGrid] Failed to persist column order for ${orderPreferenceKey}:`, err)
        })
      }
    },
    [setPreference, orderPreferenceKey],
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
        setPreference(widthsPreferenceKey, newWidths).catch((err) => {
          console.error(`[UniversalAgGrid] Failed to persist column widths for ${widthsPreferenceKey}:`, err)
        })
      }, 300)
    },
    [widthsPreferenceKey, setPreference],
  )

  // 10. Reset Column Widths: Clears preference and performs one-time clean balanced fit
  const handleResetWidths = useCallback(() => {
    setSavedWidths(null)
    setPreference(widthsPreferenceKey, null).catch((err) => {
      console.error(`[UniversalAgGrid] Failed to reset column widths for ${widthsPreferenceKey}:`, err)
    })
    if (gridApiRef.current) {
      gridApiRef.current.resetColumnState()
      if (typeof gridApiRef.current.sizeColumnsToFit === 'function') {
        gridApiRef.current.sizeColumnsToFit()
      }
    }
  }, [widthsPreferenceKey, setPreference])

  // 11. Shape row for grid updating (Context Preservation & Schema Conformance)
  // Ensures saved document matches the exact projection active in the grid before updating
  const shapeRowForGrid = useCallback(
    (sourceDoc: Record<string, unknown>, existingRowData?: Record<string, unknown>) => {
      if (!sourceDoc) return existingRowData || {}

      const updatedRow: Record<string, unknown> = { ...(existingRowData || {}), id: sourceDoc.id }

      activePayloadColumns.forEach((col) => {
        const accessor = col.accessor
        if (!accessor || accessor.startsWith('__')) return

        const override = presentation.overrides?.[accessor]
        const cellType = override?.cellType
        const fieldType = col.field && 'type' in col.field ? col.field.type : undefined

        let rawVal: unknown
        if (accessor.includes('.')) {
          const parts = accessor.split('.')
          let curr: unknown = sourceDoc
          for (const part of parts) {
            if (curr == null || typeof curr !== 'object') break
            curr = (curr as Record<string, unknown>)[part]
          }
          rawVal = curr
        } else if (accessor in sourceDoc) {
          rawVal = sourceDoc[accessor]
        }

        if (rawVal === undefined) return

        // 1. Media thumbnail columns expect the media object or image url
        const isThumbnailField =
          cellType === 'thumbnail' ||
          (typeof rawVal === 'object' && rawVal !== null && ('url' in rawVal || 'filename' in rawVal))

        // 2. Array columns (structured data, multiple relations, media galleries) are preserved intact
        if (Array.isArray(rawVal)) {
          updatedRow[accessor] = rawVal
          return
        }

        // 3. Single relationship object fields: normalize to canonical scalar ID symmetrically across initial load and in-place updates
        if (
          !isThumbnailField &&
          (cellType === 'relationship' ||
            fieldType === 'relationship' ||
            (typeof rawVal === 'object' && rawVal !== null && 'id' in rawVal && !('url' in rawVal) && !('filename' in rawVal)))
        ) {
          updatedRow[accessor] =
            rawVal && typeof rawVal === 'object' && 'id' in rawVal
              ? (rawVal as { id: unknown }).id
              : rawVal
          return
        }

        updatedRow[accessor] = rawVal
      })

      // Retain common top-level scalar metadata fields if present without collection assumptions
      Object.keys(sourceDoc).forEach((key) => {
        if (updatedRow[key] === undefined) {
          const val = sourceDoc[key]
          if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            updatedRow[key] = val
          }
        }
      })

      return updatedRow
    },
    [activePayloadColumns, presentation.overrides],
  )

  // Symmetrically shape docs to guarantee exact grid contract conformance on load
  const shapedDocs = useMemo(() => {
    return docs.map((doc) => shapeRowForGrid(doc, doc))
  }, [docs, shapeRowForGrid])

  // 12. Expose updateRow and resetWidths to parent via imperative ref
  useImperativeHandle(
    ref,
    () => ({
      updateRow: (savedDoc: Record<string, unknown>) => {
        const api = gridApiRef.current
        if (!api || !savedDoc?.id) return

        const rowNode = api.getRowNode(String(savedDoc.id))
        if (rowNode && rowNode.data) {
          const shapedRow = shapeRowForGrid(savedDoc, rowNode.data)
          api.applyTransaction({ update: [shapedRow] })
        }
      },
      resetWidths: handleResetWidths,
    }),
    [shapeRowForGrid, handleResetWidths],
  )

  // 13. Single Click Row Inspection Handler (Peek Trigger)
  const onCellClicked = useCallback(
    (event: CellClickedEvent) => {
      // Ignore system columns (selection checkbox and row actions)
      const colId = event.colDef.colId
      if (colId === '__selection' || colId === '__actions') {
        return
      }

      // Check if user clicked an interactive link or button inside a cell
      const target = event.event?.target as HTMLElement | null
      if (target && (target.closest('a') || target.closest('button') || target.closest('input'))) {
        return
      }

      const rowData = event.data
      const rowId = rowData?.id
      if (rowId != null && onRowClick) {
        onRowClick(rowId, rowData)
      }
    },
    [onRowClick],
  )

  useEffect(() => {
    if (gridApiRef.current && typeof gridApiRef.current.resetRowHeights === 'function') {
      gridApiRef.current.resetRowHeights()
    }
  }, [density])

  return (
    <div className="ut-grid-outer w-full relative">
      {/* Visual Reset Layout Bar (Visible when custom widths are saved) */}
      {savedWidths && Object.keys(savedWidths).length > 0 && (
        <div className="ut-reset-layout-bar flex items-center justify-between px-3 py-1.5 bg-[#181a52] border-b border-[#2E3191] text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Custom column layout applied
          </span>
          <button
            type="button"
            onClick={handleResetWidths}
            className="text-xs text-amber-300 hover:text-amber-200 hover:bg-[#1a1c58] hover:border-amber-400/60 flex items-center gap-1.5 transition-all cursor-pointer bg-[#232573] px-2.5 py-1 rounded border border-[#2E3191] shadow-sm hover:shadow-md"
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
      <div className={`ut-grid-viewport is-density-${density} flex-1 w-full min-w-0`} style={{ height: 560, minHeight: 480 }}>
        <AgGridReact
          theme={luxuryAgGridTheme}
          rowData={shapedDocs}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          getRowId={(params) => String(params.data?.id)}
          onGridReady={onGridReady}
          onSortChanged={onSortChanged}
          onColumnMoved={onColumnMoved}
          onColumnResized={onColumnResized}
          onCellClicked={onCellClicked}
          domLayout="normal"
          suppressCellFocus={true}
          animateRows={true}
          suppressMovableColumns={false}
          suppressDragLeaveHidesColumns={true}
          rowClass="cursor-pointer"
        />
      </div>
    </div>
  )
})

UniversalAgGrid.displayName = 'UniversalAgGrid'

