'use client'

/**
 * C_SectionDrawer - قائمة جانبية لإضافة وتعديل عناصر Array
 * - إضافة: زر "+ Add" يضيف صفاً جديداً للنموذج أولاً ثم يفتح القائمة لتعديله
 * - تعديل: النقر على بطاقة العنصر يفتح القائمة للتعديل
 * تم تحسين هذا المكون ليتوافق مع Lexical RichText وغيرها من الحقول المعقدة
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
const getTranslation = (label: unknown, _i18n?: unknown): string => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object' && 'en' in label) return (label as Record<string, unknown>).en as string
  return String(label || '')
}
import {
  ArrayField,
  Button,
  Drawer,
  RenderFields,
  useField,
  useForm,
  useModal,
  useTranslation,
} from '@payloadcms/ui'
import type { ArrayFieldClientComponent } from 'payload'

type SectionDrawerContextValue = {
  openEditDrawer: (path: string) => void
  drawerSlug: string
  arrayPath: string
}

const SectionDrawerContext = createContext<SectionDrawerContextValue | null>(null)

export const useSectionDrawer = () => useContext(SectionDrawerContext)

const SectionDrawerContent: React.FC<{
  drawerSlug: string
  title: string
  schemaPath: string
  fields: Array<Record<string, unknown>>
  permissions: Record<string, unknown>
  editPath: string
  isNewRow: boolean
  onSave: () => void
  onCancel: () => void
}> = ({
  drawerSlug,
  title,
  schemaPath,
  fields,
  permissions,
  editPath,
  isNewRow,
  onSave,
  onCancel,
}) => {
  return (
    <Drawer slug={drawerSlug} title={title}>
      <div style={{ paddingBottom: 'var(--gutter-h)' }}>
        {/* RenderFields now receives a REAL path in the form state (editPath) */}
        <RenderFields
          fields={fields as Parameters<typeof RenderFields>[0]['fields']}
          forceRender
          parentIndexPath={editPath}
          parentPath={editPath}
          parentSchemaPath={schemaPath}
          permissions={(((permissions as Record<string, unknown>)?.fields ?? permissions) as Parameters<typeof RenderFields>[0]['permissions'])}
          readOnly={false}
        />
        <div style={{ display: 'flex', gap: '1rem', marginTop: 'var(--gutter-h)' }}>
          <Button buttonStyle="primary" onClick={onSave} className="drawer-btn-save">
            {isNewRow ? 'Add & Close' : 'Done'}
          </Button>
          {isNewRow && (
            <Button buttonStyle="secondary" onClick={onCancel} className="drawer-btn-cancel">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export const SectionDrawer: ArrayFieldClientComponent = (props) => {
  const { field, path: pathFromProps, permissions = {} } = props
  const path = (pathFromProps ?? field?.name ?? '') as string
  const { i18n } = useTranslation()
  const { dispatchFields } = useForm()

  const [editPath, setEditPath] = useState<string | null>(null)
  const [isNewRow, setIsNewRow] = useState<boolean>(false)
  const [newRowIndex, setNewRowIndex] = useState<number | null>(null)

  const labels = useMemo(() => {
    if (field?.labels) return field.labels
    return { plural: 'Items', singular: 'Item' }
  }, [field?.labels])

  const drawerSlug = useMemo(() => `section-drawer-${path.replace(/\./g, '-')}`, [path])
  const { closeModal, isModalOpen, toggleModal } = useModal()

  const singularLabel = getTranslation(labels?.singular, i18n)
  const drawerTitle = isNewRow ? `Add ${singularLabel}` : `Edit ${singularLabel}`

  const fields = (field?.fields ?? []) as Array<Record<string, unknown>>
  const { rows = [] } = useField({ path, hasRows: true }) as { rows?: unknown[] }

  const handleAddNew = useCallback(() => {
    const nextIndex = rows.length

    // 1. Dispatch ADD_ROW exactly like the default ArrayField does
    // This creates the proper initial state in Payload's internal form state,
    // which is strictly required for Lexical RichText editors to mount without crashing.
    dispatchFields({ type: 'ADD_ROW', path, rowIndex: nextIndex, subFieldState: {} })

    // 2. Track that this is a new row in case the user cancels
    setIsNewRow(true)
    setNewRowIndex(nextIndex)

    // 3. Open the drawer targeting the newly injected row path
    setEditPath(`${path}.${nextIndex}`)
    toggleModal(drawerSlug)
  }, [dispatchFields, path, rows.length, drawerSlug, toggleModal])

  const openEditDrawer = useCallback(
    (rowPath: string) => {
      setIsNewRow(false)
      setNewRowIndex(null)
      setEditPath(rowPath)
      toggleModal(drawerSlug)
    },
    [drawerSlug, toggleModal],
  )

  const handleSave = useCallback(() => {
    setEditPath(null)
    setIsNewRow(false)
    setNewRowIndex(null)
    closeModal(drawerSlug)
  }, [drawerSlug, closeModal])

  const handleCancel = useCallback(() => {
    // If it was a new row and the user cancelled, we remove it from form state
    if (isNewRow && newRowIndex !== null) {
      dispatchFields({ type: 'REMOVE_ROW', path, rowIndex: newRowIndex })
    }
    setEditPath(null)
    setIsNewRow(false)
    setNewRowIndex(null)
    closeModal(drawerSlug)
  }, [isNewRow, newRowIndex, dispatchFields, path, drawerSlug, closeModal])

  const contextValue = useMemo<SectionDrawerContextValue>(
    () => ({ openEditDrawer, drawerSlug, arrayPath: path }),
    [openEditDrawer, drawerSlug, path],
  )

  return (
    <SectionDrawerContext.Provider value={contextValue}>
      <div className="array-field-with-section-drawer">
        <style>{`
          .array-field-with-section-drawer .array-field .array-field__add-row {
            display: none !important;
          }
          /* Hide internal fields when viewing the list - we only want the custom RowLabel */
          .array-field-with-section-drawer .array-field .array-field__row .array-field__fields,
          .array-field-with-section-drawer .array-field .collapsible__content .array-field__fields {
            display: none !important;
          }
          .array-field-with-section-drawer .member-row-label--clickable:hover {
            background: var(--theme-elevation-100);
          }
          .array-field-with-section-drawer .collapsible .collapsible__toggle {
            display: none !important;
          }
          .array-field-with-section-drawer .array-field__row-header .member-row-label-preview {
            pointer-events: auto;
            flex: 1;
            min-width: 0;
          }
          .array-field-with-section-drawer .array-field__row .collapsible__indicator {
            display: none !important;
          }
          .array-field-with-section-drawer .array-field__row .collapsible__content {
            display: none !important;
          }
          .array-field-with-section-drawer .array-field__row .collapsible__toggle-wrap {
            border-radius: var(--style-radius-m);
          }
          .array-field-with-section-drawer .array-field__header-actions li:first-child,
          .array-field-with-section-drawer .array-field__header-actions li:nth-child(2) {
            display: none !important;
          }
          .array-field-with-section-drawer .array-field__add-via-drawer {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }
        `}</style>

        {/* Add Button - Invokes handleAddNew */}
        <div style={{ marginBottom: '1rem' }} onClick={handleAddNew}>
          <Button className="array-field__add-via-drawer" buttonStyle="secondary">
            + Add {singularLabel}
          </Button>
        </div>

        <ArrayField {...props} />

        {isModalOpen(drawerSlug) && editPath && (
          <SectionDrawerContent
            drawerSlug={drawerSlug}
            title={drawerTitle}
            schemaPath={path}
            fields={fields}
            permissions={permissions as Record<string, unknown>}
            editPath={editPath}
            isNewRow={isNewRow}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </SectionDrawerContext.Provider>
  )
}
