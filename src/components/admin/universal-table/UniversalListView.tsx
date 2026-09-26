'use client'

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import type { ListViewClientProps } from 'payload'
import { useRouter } from 'next/navigation'
import { formatAdminURL, formatFilesize } from 'payload/shared'
import {
  DefaultListView,
  useListQuery,
  usePreferences,
  useConfig,
  useTranslation,
  useStepNav,
  useWindowInfo,
  useModal,
  useBulkUpload,
  useListDrawerContext,
  TableColumnsProvider,
  SelectionProvider,
  RelationshipProvider,
  Gutter,
  ListHeader,
  ListControls,
  PageControls,
  Button,
  SelectMany,
  RenderCustomComponent,
  ViewDescription,
  StickyToolbar,
} from '@payloadcms/ui'
import { UniversalAgGrid, type UniversalAgGridRef } from './UniversalAgGrid'
import { QuickFilterDropdown, ResetControl, DensitySwitcher } from './toolbar'
import { PeekDrawer, DocumentDrawerBridge } from './drawer'
import { CommandPalette } from './command'
import { BulkActionBar } from './bulk'
import { extractClauseMap } from './utils/composeWhere'
import { getPresentationConfig, registerPresentationConfig } from './registry'
export { getPresentationConfig, registerPresentationConfig }
import type { CollectionPresentationConfig, TableFilterOption, DensityMode } from './types'
import './universal-table.css'

function getLabelString(label: any, i18n?: any): string {
  if (!label) return ''
  if (typeof label === 'string') return label
  if (typeof label === 'object') {
    return label[i18n?.language] || label['en'] || Object.values(label)[0] || ''
  }
  return String(label)
}

const DEFAULT_DENSITY: DensityMode = 'comfortable'

/**
 * Universal Collection View Adapter:
 * Uses Payload's native UI building blocks to preserve 100% of Payload's native capabilities:
 * - Native SearchBar (debounced, URL synced, accessible, translated placeholder)
 * - Native Pagination, Breadcrumbs/StepNav, Selection, Permissions, and Bulk Actions
 * - Native Document Drawer with full edit context preservation
 *
 * Architectural Protection & Intent-Driven Filtration:
 * - Native WhereBuilder Preservation: Field-identity key boundary isolates WhereBuilder from condition row reuse without disabling filters.
 * - Native Column Preservation: Columns UI fully enabled, backed by Payload's native collectionPreferences in DB.
 * - Operational Intent Toolbar: Stable-identity QuickFilter dropdowns + DensitySwitcher + Reset.
 * - Authoritative Server KPIs: Scalable server-aggregated metrics with bounded SQL counts for 100k+ records.
 * - Table: Luxury UniversalAgGrid with AG Grid native drag-reorder persisted to usePreferences.
 */
export const UniversalListView: React.FC<ListViewClientProps> = (props) => {
  const { collectionSlug } = props
  const presentation = getPresentationConfig(collectionSlug)
  const { config, getEntityConfig } = useConfig()
  const router = useRouter()
  const apiRoute = config?.routes?.api || '/api'
  const adminRoute = config?.routes?.admin || '/admin'
  const serverURL = config?.serverURL || ''
  const { getPreference, setPreference } = usePreferences()
  const densityPrefKey = `universal-grid-density:${collectionSlug}`

  const { data, isGroupingBy, query } = useListQuery()
  const { i18n } = useTranslation()
  const { setStepNav } = useStepNav()
  const {
    breakpoints: { s: smallBreak },
  } = useWindowInfo()

  const { allowCreate, createNewDrawerSlug, isInDrawer, onBulkSelect } = useListDrawerContext()
  const hasCreatePermission =
    allowCreate !== undefined
      ? allowCreate && props.hasCreatePermission
      : props.hasCreatePermission

  const { openModal } = useModal()
  const { drawerSlug: bulkUploadDrawerSlug, setCollectionSlug, setOnSuccess } = useBulkUpload()

  const collectionConfig = getEntityConfig({ collectionSlug })
  const labels = collectionConfig?.labels
  const upload = (collectionConfig as any)?.upload
  const isUploadCollection = Boolean(upload)
  const isBulkUploadEnabled =
    isUploadCollection && Boolean((collectionConfig as any)?.upload?.bulkUpload)
  const isTrashEnabled = Boolean((collectionConfig as any)?.trash)

  const gridRef = useRef<UniversalAgGridRef>(null)
  const [peekState, setPeekState] = useState<{ id: string | number; initialRow: any } | null>(null)
  const [editDocId, setEditDocId] = useState<string | number | null>(null)
  const [density, setDensity] = useState<DensityMode>(DEFAULT_DENSITY)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Global Keyboard Shortcut: ⌘K or Ctrl+K to toggle Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        e.stopPropagation()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // StepNav / Breadcrumb synchronization (identical to Payload native)
  useEffect(() => {
    if (!isInDrawer && labels) {
      const baseLabel = {
        label: getLabelString(labels?.plural, i18n),
        url:
          isTrashEnabled && props.viewType === 'trash'
            ? formatAdminURL({
                adminRoute,
                path: `/collections/${collectionSlug}`,
              })
            : undefined,
      }

      const trashLabel = {
        label: i18n.t('general:trash'),
      }

      const navItems =
        isTrashEnabled && props.viewType === 'trash' ? [baseLabel, trashLabel] : [baseLabel]

      setStepNav(navItems)
    }
  }, [
    adminRoute,
    setStepNav,
    serverURL,
    labels,
    isInDrawer,
    isTrashEnabled,
    props.viewType,
    i18n,
    collectionSlug,
  ])

  // Load density preference on mount without writing default to DB
  useEffect(() => {
    let isMounted = true
    getPreference<DensityMode>(densityPrefKey)
      .then((res: any) => {
        if (isMounted && (res === 'comfortable' || res === 'compact' || res === 'dense')) {
          setDensity(res as DensityMode)
        }
      })
      .catch((err) => {
        console.error(`[UniversalListView] Failed to load density preference for ${densityPrefKey}:`, err)
      })
    return () => {
      isMounted = false
    }
  }, [getPreference, densityPrefKey])

  const handleDensityChange = useCallback(
    (newDensity: DensityMode) => {
      setDensity(newDensity)
      setPreference(densityPrefKey, newDensity).catch((err) => {
        console.error(`[UniversalListView] Failed to save density preference for ${densityPrefKey}:`, err)
      })
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
    gridRef.current?.updateRow(savedDoc)
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
        .catch((err) => {
          console.error(`[UniversalListView] Failed to fetch updated document ${closingId} for ${collectionSlug}:`, err)
        })
    }
  }, [apiRoute, collectionSlug, editDocId, handleDocumentSave])

  const openBulkUpload = useCallback(() => {
    setCollectionSlug(collectionSlug)
    openModal(bulkUploadDrawerSlug)
    setOnSuccess(() => router.refresh())
  }, [router, collectionSlug, bulkUploadDrawerSlug, openModal, setCollectionSlug, setOnSuccess])

  const rawDocs = data?.docs
  const docs = useMemo(() => {
    if (isUploadCollection && Array.isArray(rawDocs)) {
      return rawDocs.map((doc: any) => ({
        ...doc,
        filesize: formatFilesize(doc.filesize),
      }))
    }
    return (rawDocs as any[]) || []
  }, [rawDocs, isUploadCollection])

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

  // Architectural Boundary: Field-based identity boundary for ListControls / WhereBuilder.
  // Isolates Native Payload WhereBuilder from operational quick-filter transitions
  // (e.g. Outstanding [paymentStatus] -> Confirmed [status]).
  // When active filter field structure transitions, React remounts ListControls, preventing
  // internal Condition React state reuse bugs (e.g. status=unpaid) without patching Payload or hiding filters.
  const activeFilterFieldsKey = useMemo(() => {
    if (!query?.where || typeof query.where !== 'object') return 'empty'
    const clauseMap = extractClauseMap(query.where)
    const keys = Array.from(clauseMap.keys()).sort().join(':')
    return keys || 'empty'
  }, [query])

  if (!presentation) {
    return <DefaultListView {...props} />
  }

  const quickFilters = presentation.toolbar?.quickFilters || []
  const hasQuickFilters =
    presentation.toolbar?.capabilities?.quickFilters !== false && quickFilters.length > 0
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
    <button
      key="ut-cmd-palette-trigger"
      type="button"
      className="ut-command-palette-trigger"
      onClick={() => setIsCommandPaletteOpen(true)}
      title="Open Command Palette (⌘K / Ctrl+K)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span>Commands</span>
      <kbd className="ut-command-palette-trigger-kbd">⌘K</kbd>
    </button>,
    ...quickFilterActions,
    <DensitySwitcher key="ut-density-switcher" value={density} onChange={handleDensityChange} />,
    ...(Array.isArray(props.beforeActions) ? props.beforeActions : []),
  ]

  const BeforeListTableContent = props.BeforeListTable || null

  return (
    <div className="universal-table-root w-full">
      <TableColumnsProvider collectionSlug={collectionSlug} columnState={props.columnState}>
          <div className={`collection-list collection-list--${collectionSlug}`}>
          <SelectionProvider docs={docs} totalDocs={Number(data?.totalDocs || 0)}>
            {props.BeforeList}
            <Gutter className="collection-list__wrap">
              <ListHeader
                collectionConfig={collectionConfig}
                Description={
                  props.Description || collectionConfig?.admin?.description ? (
                    <div className="collection-list__sub-header">
                      <RenderCustomComponent
                        CustomComponent={props.Description}
                        Fallback={
                          <ViewDescription
                            collectionSlug={collectionSlug}
                            description={(collectionConfig?.admin?.description as any) || ''}
                          />
                        }
                      />
                    </div>
                  ) : undefined
                }
                disableBulkDelete={props.disableBulkDelete}
                disableBulkEdit={props.disableBulkEdit}
                hasCreatePermission={hasCreatePermission}
                hasDeletePermission={props.hasDeletePermission}
                hasTrashPermission={props.hasTrashPermission}
                i18n={i18n}
                isBulkUploadEnabled={isBulkUploadEnabled && !upload?.hideFileInputOnCreate}
                isTrashEnabled={isTrashEnabled}
                newDocumentURL={props.newDocumentURL}
                openBulkUpload={openBulkUpload}
                smallBreak={smallBreak}
                viewType={props.viewType}
              />
              <ListControls
                key={`list-controls-${collectionSlug}-${activeFilterFieldsKey}`}
                beforeActions={
                  props.enableRowSelections && typeof onBulkSelect === 'function'
                    ? combinedBeforeActions
                      ? [...combinedBeforeActions, <SelectMany key="select-many" onClick={onBulkSelect} />]
                      : [<SelectMany key="select-many" onClick={onBulkSelect} />]
                    : combinedBeforeActions
                }
                collectionConfig={collectionConfig}
                collectionSlug={collectionSlug}
                enableFilters={presentation.toolbar?.capabilities?.advancedFilters !== false}
                enableColumns={presentation.toolbar?.capabilities?.columns !== false}
                listMenuItems={props.listMenuItems}
              />
              {BeforeListTableContent}
              {docs?.length > 0 && (
                <div className="collection-list__tables">
                  <RelationshipProvider>
                    <UniversalAgGrid
                      ref={gridRef}
                      presentation={presentation}
                      density={density}
                      onRowClick={handleRowClick}
                    />
                  </RelationshipProvider>
                </div>
              )}
              {docs?.length === 0 && (
                <div className="no-results">
                  {props.viewType === 'trash' ? (
                    <p>
                      {i18n.t('general:noTrashResults', {
                        label: getLabelString(labels?.plural, i18n),
                      })}
                    </p>
                  ) : (
                    <>
                      <h3>{i18n.t('general:noResultsFound')}</h3>
                      <p>{i18n.t('general:noResultsDescription')}</p>
                    </>
                  )}
                  {hasCreatePermission && props.newDocumentURL && props.viewType !== 'trash' && (
                    <div className="no-results__actions">
                      {isInDrawer ? (
                        <Button
                          el="button"
                          key="create"
                          onClick={() => openModal(createNewDrawerSlug || '')}
                        >
                          {i18n.t('general:createNewLabel', {
                            label: getLabelString(labels?.singular, i18n),
                          })}
                        </Button>
                      ) : (
                        <Button el="link" key="create" to={props.newDocumentURL}>
                          {i18n.t('general:createNewLabel', {
                            label: getLabelString(labels?.singular, i18n),
                          })}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {props.AfterListTable}
              {docs?.length > 0 && !isGroupingBy && (
                <PageControls collectionConfig={collectionConfig} />
              )}
            </Gutter>
            {props.AfterList}
            <BulkActionBar
              collectionSlug={collectionSlug}
              collectionConfig={collectionConfig}
              presentation={presentation}
              onOpenPeek={(id) => handleRowClick(id, null)}
              onDocUpdated={handleDocumentSave}
            />
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              collectionSlug={collectionSlug}
              presentation={presentation}
              density={density}
              onDensityChange={handleDensityChange}
              onOpenPeek={(id) => handleRowClick(id, null)}
              onResetWidths={() => gridRef.current?.resetWidths?.()}
            />
          </SelectionProvider>
        </div>
      </TableColumnsProvider>
      {docs?.length > 0 && isGroupingBy && (data as any)?.totalPages > 1 && (
        <StickyToolbar>
          <PageControls collectionConfig={collectionConfig} />
        </StickyToolbar>
      )}

      {/* Editorial Mixed-Surface Peek Drawer - Mounted ONLY when active */}
      {peekState && (
        <PeekDrawer
          collectionSlug={collectionSlug}
          docId={peekState.id}
          initialRow={peekState.initialRow}
          presentation={presentation}
          onClose={handleClosePeek}
          onOpenEditDrawer={handleOpenEditDrawer}
          onDocUpdated={handleDocumentSave}
        />
      )}

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
