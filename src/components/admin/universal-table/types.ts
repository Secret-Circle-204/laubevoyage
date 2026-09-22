export type TableAlign = 'left' | 'center' | 'right'

export type TableCellType =
  | 'thumbnail'
  | 'title'
  | 'location'
  | 'badge'
  | 'price'
  | 'date'
  | 'text'
  | 'accommodations'
  | 'itinerary'
  | 'gallery'

export interface TableCellProps<TData = any> {
  row: TData
  value?: unknown
  field?: string
}

export type CellRendererProps<TData = any> = TableCellProps<TData>

export interface TableColumn<TData = any> {
  id: string
  header: string
  field?: keyof TData | string
  cellType?: TableCellType
  align?: TableAlign
  width?: string | number
  minWidth?: number
  maxWidth?: number
  flex?: number
  resizable?: boolean
  sortable?: boolean
  sortField?: string
}

export interface TableAction {
  id: string
  label: string
  variant?: 'default' | 'danger'
  hrefTemplate?: string
  confirm?: boolean
}

export interface TableFilterOption {
  label: string
  value: string
}

export type FilterOptionSource =
  | { type: 'static'; options: TableFilterOption[] }
  | { type: 'relationship'; relationTo: string; labelField?: string; valueField?: string }

export interface FilterDefinition {
  id: string
  field: string
  label: string
  placeholder?: string
  source: FilterOptionSource
  operator?: 'equals' | 'in' | 'like'
}

export interface ToolbarCapabilities {
  search?: boolean
  quickFilters?: boolean
  columns?: boolean
  advancedFilters?: boolean
  reset?: boolean
}

export interface ToolbarConfig {
  searchPlaceholder?: string
  searchFields?: string[]
  quickFilters?: FilterDefinition[]
  capabilities?: ToolbarCapabilities
}

export interface TableFilter {
  id: string
  label: string
  field: string
  options: TableFilterOption[]
}

export type TableMetricVariant = 'default' | 'success' | 'warning' | 'info'
export type TableMetricIcon = 'bag' | 'check' | 'alert' | 'pin' | 'layers' | 'calendar'

export interface TableMetric {
  id: string
  label: string
  value: string | number
  subValue?: string
  percentage?: number
  variant?: TableMetricVariant
  icon?: TableMetricIcon
}

export interface TableCapabilities {
  selection?: boolean
  bulkActions?: boolean
  metrics?: boolean
}

export interface ColumnPresentationOverride {
  header?: string
  width?: number
  minWidth?: number
  maxWidth?: number
  flex?: number
  cellType?: TableCellType
  sortable?: boolean
  resizable?: boolean
}

export interface CollectionPresentationConfig {
  collectionSlug: string
  title?: string
  description?: string
  overrides: Record<string, ColumnPresentationOverride>
  rowActions?: TableAction[]
  capabilities?: TableCapabilities
  toolbar?: ToolbarConfig
}

/**
 * Declarative, pure JSON-serializable configuration for any collection's Universal Table.
 * Zero functions across Server/Client boundary. Pure descriptors.
 */
export interface TableConfig<TData = any> {
  collectionSlug: string
  title: string
  description?: string
  bannerTitle?: string
  bannerSubtitle?: string
  createButtonText?: string
  createHref?: string
  columns: TableColumn<TData>[]
  overrides?: Record<string, ColumnPresentationOverride>
  filters?: TableFilter[]
  rowActions?: TableAction[]
  capabilities?: TableCapabilities
}

/**
 * Server-computed runtime data provided by Payload at request time.
 */
export interface TableRuntime<TData = any> {
  docs: TData[]
  totalDocs: number
  page: number
  totalPages: number
  limit: number
  hasCreatePermission: boolean
  newDocumentURL?: string
  metrics?: TableMetric[]
}
