import React from 'react'
import type { TableCellProps } from '../types'

export const TitleSubtitleCell: React.FC<TableCellProps> = ({
  row,
  field = 'title',
  value,
  collectionSlug: propCollectionSlug,
}) => {
  const rawVal = value !== undefined ? value : (field ? row?.[field] : null)

  // Explicit Contract Violation detection: Cell must receive a display scalar from projection boundary
  if (typeof rawVal === 'object' && rawVal !== null) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[TitleSubtitleCell Contract Violation] Field '${field}' received an unprojected object instead of a display scalar:`,
        rawVal,
      )
    }
  }

  const title =
    typeof rawVal === 'string' || typeof rawVal === 'number'
      ? String(rawVal)
      : typeof row?.title === 'string'
        ? row.title
        : typeof row?.name === 'string'
          ? row.name
          : 'Untitled'

  const subtitle = (row?.subtitle as string) || (row?.slug as string) || null
  const collectionSlug = propCollectionSlug || ''
  const editHref = collectionSlug && row?.id ? `/admin/collections/${collectionSlug}/${row.id}` : '#'

  return (
    <div
      className="ut-title-cell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        width: '100%',
        lineHeight: 1.35,
      }}
    >
      <a
        href={editHref}
        className="ut-title-link"
        title={title}
        style={{
          fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
          fontSize: '13.5px',
          fontWeight: 600,
          color: '#f8fafc',
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '1.35',
          display: 'block',
        }}
      >
        {title}
      </a>
      {subtitle && (
        <span
          className="ut-subtitle"
          title={subtitle}
          style={{
            fontFamily: "var(--font-body, 'Montserrat', sans-serif)",
            fontSize: '11px',
            fontWeight: 400,
            color: '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.25',
            display: 'block',
            marginTop: '3px',
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  )
}
