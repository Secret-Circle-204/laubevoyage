import type { DefaultCellComponentProps, Where, WhereField, CollectionSlug } from 'payload'
import type React from 'react'

export type DensityMode = 'comfortable' | 'compact' | 'dense'

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
  | 'relationship'

/**
 * Strictly-typed custom cell renderer contract based on Payload's official DefaultCellComponentProps.
 * Ensures custom collection renderers receive identical props across native and universal views.
 */
export type UniversalCustomCellComponent = React.ComponentType<DefaultCellComponentProps>

/**
 * Strictly-typed value formatter contract for column export, accessibility, and cell value representation.
 */
export type UniversalValueFormatter<TData = Record<string, unknown>, TValue = unknown> = (
  value: TValue,
  row: TData,
) => string

export interface TableCellProps<TData = Record<string, unknown>> {
  row: TData
  value?: unknown
  field?: string
  collectionSlug?: CollectionSlug
}

export type CellRendererProps<TData = Record<string, unknown>> = TableCellProps<TData>

export interface TableColumn<TData = Record<string, unknown>> {
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
  whereCondition?: WhereField
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

export type TableMetricVariant = 'default' | 'success' | 'warning' | 'info' | 'error'
export type TableMetricIcon = 'bag' | 'check' | 'alert' | 'pin' | 'layers' | 'calendar' | 'creditCard'

export interface TableMetric {
  id: string
  label: string
  value?: string | number
  subValue?: string
  percentage?: number
  variant?: TableMetricVariant
  icon?: TableMetricIcon
  loading?: boolean
  error?: string | null
  onClick?: () => void
  whereFilter?: Where
}

export interface TableCapabilities {
  selection?: boolean
  bulkActions?: boolean
  bulkEdit?: boolean
  metrics?: boolean
}

export interface ColumnPresentationOverride<TData = Record<string, unknown>> {
  header?: string
  width?: number
  minWidth?: number
  maxWidth?: number
  flex?: number
  cellType?: TableCellType
  customCell?: UniversalCustomCellComponent
  valueFormatter?: UniversalValueFormatter<TData>
  sortable?: boolean
  resizable?: boolean
}

export interface BulkActionDefinition {
  id: string
  label: string
  variant?: 'default' | 'danger'
  icon?: string
  confirm?: {
    heading: string
    body?: string
    confirmLabel?: string
    cancelLabel?: string
  }
}

export interface PeekFieldDefinition {
  field: string
  label: string
  formatter?: 'text' | 'date' | 'price' | 'status' | 'relation' | 'arrayCount' | 'duration'
  unit?: string
  isMono?: boolean
  condition?: (doc: Record<string, unknown>) => boolean
}

export interface PeekSectionDefinition {
  id: string
  title: string
  fields: PeekFieldDefinition[]
  customSlot?: string
  condition?: (doc: Record<string, unknown>) => boolean
}

export interface MetricDescriptor {
  id: string
  label: string
  icon?: TableMetricIcon
  variant?: TableMetricVariant
  where?: Where
  calculatePercentageOfTotal?: boolean
}

export interface CollectionPresentationConfig {
  collectionSlug: CollectionSlug
  title?: string
  description?: string
  heroField?: string
  previewUrlTemplate?: string
  peekWidth?: 'standard' | 'wide'
  peekDepth?: number
  titleField?: string | ((doc: Record<string, unknown>) => string | null)
  subtitleField?: string | ((doc: Record<string, unknown>) => string | null)
  overrides: Record<string, ColumnPresentationOverride>
  rowActions?: TableAction[]
  bulkActions?: BulkActionDefinition[]
  peekSections?: PeekSectionDefinition[]
  capabilities?: TableCapabilities
  toolbar?: ToolbarConfig
  metrics?: MetricDescriptor[]
}

/**
 * Declarative, pure JSON-serializable configuration for any collection's Universal Table.
 * Zero functions across Server/Client boundary. Pure descriptors.
 */
export interface TableConfig<TData = Record<string, unknown>> {
  collectionSlug: CollectionSlug
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
export interface TableRuntime<TData = Record<string, unknown>> {
  docs: TData[]
  totalDocs: number
  page: number
  totalPages: number
  limit: number
  hasCreatePermission: boolean
  newDocumentURL?: string
  metrics?: TableMetric[]
}
