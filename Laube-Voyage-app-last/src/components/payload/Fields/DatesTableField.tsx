'use client'

/**
 * DatesTableField — Custom Array Field for Package Dates
 * Shows a compact summary table of all dates + SectionDrawer for add/edit.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react'

const getTranslation = (label: unknown, _i18n?: unknown): string => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object' && 'en' in label)
    return (label as Record<string, unknown>).en as string
  return String(label || '')
}

// --- Context for child components ---
type DatesDrawerContextValue = {
  openEditDrawer: (path: string) => void
  drawerSlug: string
  arrayPath: string
}
const DatesDrawerContext = createContext<DatesDrawerContextValue | null>(null)
export const useDatesDrawer = () => useContext(DatesDrawerContext)

// --- Date formatting helper ---
const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

// --- Sub-component: Drawer content ---
const DatesDrawerContent: React.FC<{
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
        <RenderFields
          fields={fields as Parameters<typeof RenderFields>[0]['fields']}
          forceRender
          parentIndexPath={editPath}
          parentPath={editPath}
          parentSchemaPath={schemaPath}
          permissions={
            (permissions?.fields ?? permissions) as Parameters<
              typeof RenderFields
            >[0]['permissions']
          }
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

// --- Main Component ---
export const DatesTableField: ArrayFieldClientComponent = (props) => {
  const { field, path: pathFromProps, permissions = {} } = props
  const path = (pathFromProps ?? field?.name ?? '') as string
  const { i18n } = useTranslation()
  const { dispatchFields, getFields } = useForm()

  const [editPath, setEditPath] = useState<string | null>(null)
  const [isNewRow, setIsNewRow] = useState<boolean>(false)
  const [newRowIndex, setNewRowIndex] = useState<number | null>(null)

  const labels = useMemo(() => {
    if (field?.labels) return field.labels
    return { plural: 'Dates', singular: 'Date' }
  }, [field?.labels])

  const drawerSlug = useMemo(() => `dates-drawer-${path.replace(/\./g, '-')}`, [path])
  const { closeModal, isModalOpen, toggleModal } = useModal()

  const singularLabel = getTranslation(labels?.singular, i18n)
  const drawerTitle = isNewRow ? `Add ${singularLabel}` : `Edit ${singularLabel}`

  const fields = (field?.fields ?? []) as Array<Record<string, unknown>>
  const { rows = [] } = useField({ path, hasRows: true }) as { rows?: unknown[] }

  // Read actual form values for the table
  const formFields = getFields()
  const tableData = useMemo(() => {
    return rows.map((_, idx) => {
      const prefix = `${path}.${idx}`
      const startDate = formFields[`${prefix}.startDate`]?.value as string | undefined
      const endDate = formFields[`${prefix}.endDate`]?.value as string | undefined
      const adultPrice = formFields[`${prefix}.adultPrice`]?.value as number | undefined
      const infantPrice = formFields[`${prefix}.infantPrice`]?.value as number | undefined
      return { idx, startDate, endDate, adultPrice, infantPrice }
    })
  }, [rows, formFields, path])

  const handleAddNew = useCallback(() => {
    const nextIndex = rows.length
    dispatchFields({ type: 'ADD_ROW', path, rowIndex: nextIndex, subFieldState: {} })
    setIsNewRow(true)
    setNewRowIndex(nextIndex)
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

  const handleRemoveRow = useCallback(
    (idx: number) => {
      dispatchFields({ type: 'REMOVE_ROW', path, rowIndex: idx })
    },
    [dispatchFields, path],
  )

  const handleSave = useCallback(() => {
    setEditPath(null)
    setIsNewRow(false)
    setNewRowIndex(null)
    closeModal(drawerSlug)
  }, [drawerSlug, closeModal])

  const handleCancel = useCallback(() => {
    if (isNewRow && newRowIndex !== null) {
      dispatchFields({ type: 'REMOVE_ROW', path, rowIndex: newRowIndex })
    }
    setEditPath(null)
    setIsNewRow(false)
    setNewRowIndex(null)
    closeModal(drawerSlug)
  }, [isNewRow, newRowIndex, dispatchFields, path, drawerSlug, closeModal])

  const contextValue = useMemo<DatesDrawerContextValue>(
    () => ({ openEditDrawer, drawerSlug, arrayPath: path }),
    [openEditDrawer, drawerSlug, path],
  )

  return (
    <DatesDrawerContext.Provider value={contextValue}>
      <div
        className="dates-table-field"
        style={{
          marginBottom: '2.5rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid var(--theme-elevation-200)',
        }}
      >
        <style>{`
          .dates-table-field .array-field { display: none !important; }
          .dates-table-field .dates-summary-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: var(--style-radius-m);
            overflow: hidden;
            border: 1px solid var(--theme-elevation-200);
          }
          .dates-table-field .dates-summary-table th {
            background: var(--theme-elevation-100);
            padding: 0.6rem 1rem;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--theme-elevation-600);
            text-align: left;
            border-bottom: 2px solid var(--theme-elevation-200);
          }
          .dates-table-field .dates-summary-table td {
            padding: 0.7rem 1rem;
            font-size: 0.85rem;
            color: var(--theme-text);
            border-bottom: 1px solid var(--theme-elevation-100);
            vertical-align: middle;
          }
          .dates-table-field .dates-summary-table tr:last-child td {
            border-bottom: none;
          }
          .dates-table-field .dates-summary-table tbody tr {
            cursor: pointer;
            transition: background 0.15s ease;
          }
          .dates-table-field .dates-summary-table tbody tr:hover {
            background: var(--theme-elevation-50);
          }
          .dates-table-field .dates-summary-table .price-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 700;
          }
          .dates-table-field .dates-summary-table .price-badge--adult {
            background: rgba(46, 49, 146, 0.1);
            color: rgb(46, 49, 146);
          }
          [data-theme="dark"] .dates-table-field .dates-summary-table .price-badge--adult {
            background: rgba(100, 130, 255, 0.15);
            color: rgb(140, 160, 255);
          }
          .dates-table-field .dates-summary-table .price-badge--infant {
            background: rgba(245, 130, 32, 0.1);
            color: rgb(245, 130, 32);
          }
          .dates-table-field .dates-summary-table .date-range {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
          }
          .dates-table-field .dates-summary-table .date-range svg {
            color: var(--theme-elevation-400);
            flex-shrink: 0;
          }
          .dates-table-field .dates-summary-table .action-btns {
            display: flex;
            gap: 0.25rem;
            align-items: center;
          }
          .dates-table-field .dates-summary-table .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--theme-elevation-400);
            transition: all 0.15s ease;
          }
          .dates-table-field .dates-summary-table .action-btn:hover {
            background: var(--theme-elevation-150);
            color: var(--theme-text);
          }
          .dates-table-field .dates-summary-table .action-btn--delete:hover {
            background: rgba(239, 68, 68, 0.1);
            color: rgb(239, 68, 68);
          }
          .dates-table-field .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 2.5rem;
            border: 2px dashed var(--theme-elevation-200);
            border-radius: var(--style-radius-m);
            color: var(--theme-elevation-400);
            text-align: center;
          }
          .dates-table-field .empty-state svg { opacity: 0.4; }
          .dates-table-field .empty-state span { font-size: 0.85rem; font-weight: 500; }
        `}</style>

        {/* Header with Add button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--theme-elevation-500)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--theme-text)' }}>
              Available Dates
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'var(--theme-elevation-150)',
                color: 'var(--theme-elevation-600)',
                padding: '0.1rem 0.5rem',
                borderRadius: '999px',
              }}
            >
              {rows.length}
            </span>
          </div>
          <Button buttonStyle="secondary" onClick={handleAddNew} size="small">
            <Plus size={14} />
            Add Date
          </Button>
        </div>

        {/* Table or Empty State */}
        {tableData.length > 0 ? (
          <table className="dates-summary-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date Range</th>
                <th>Adult Price</th>
                <th>Infant Price</th>
                <th style={{ width: '70px' }}></th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.idx} onClick={() => openEditDrawer(`${path}.${row.idx}`)}>
                  <td
                    style={{
                      fontWeight: 700,
                      color: 'var(--theme-elevation-400)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {String(row.idx + 1).padStart(2, '0')}
                  </td>
                  <td>
                    <div className="date-range">
                      <Calendar size={14} />
                      <span>{fmtDate(row.startDate)}</span>
                      {row.endDate && (
                        <>
                          <span style={{ color: 'var(--theme-elevation-300)' }}>→</span>
                          <span>{fmtDate(row.endDate)}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    {row.adultPrice != null ? (
                      <span className="price-badge price-badge--adult">${row.adultPrice}</span>
                    ) : (
                      <span style={{ color: 'var(--theme-elevation-350)', fontSize: '0.75rem' }}>
                        Default
                      </span>
                    )}
                  </td>
                  <td>
                    {row.infantPrice != null ? (
                      <span className="price-badge price-badge--infant">${row.infantPrice}</span>
                    ) : (
                      <span style={{ color: 'var(--theme-elevation-350)', fontSize: '0.75rem' }}>
                        Default
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDrawer(`${path}.${row.idx}`)
                        }}
                        title="Edit"
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="action-btn action-btn--delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveRow(row.idx)
                        }}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <Calendar size={32} />
            <span>No dates added yet</span>
            <Button buttonStyle="secondary" onClick={handleAddNew} size="small">
              <Plus size={14} />
              Add First Date
            </Button>
          </div>
        )}

        {/* Hidden ArrayField to maintain Payload form state */}
        <div style={{ display: 'none' }}>
          <ArrayField {...props} />
        </div>

        {/* Drawer */}
        {isModalOpen(drawerSlug) && editPath && (
          <DatesDrawerContent
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
    </DatesDrawerContext.Provider>
  )
}
