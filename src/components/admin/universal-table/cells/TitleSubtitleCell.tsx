import React from 'react'
import type { TableCellProps } from '../types'

export const TitleSubtitleCell: React.FC<TableCellProps> = ({ row, field = 'title' }) => {
  const title =
    (row?.[field] as string) ||
    (row?.title as string) ||
    (row?.name as string) ||
    'Untitled'
  const subtitle = (row?.subtitle as string) || (row?.slug as string) || null
  const editHref = `/admin/collections/experiences/${row?.id}`

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
