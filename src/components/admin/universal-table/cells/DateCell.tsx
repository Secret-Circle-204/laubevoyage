import React from 'react'
import type { TableCellProps } from '../types'

function getRelativeTime(date: Date): string | null {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // Guard against future timestamps
  if (diffInSeconds < 0) return null
  if (diffInSeconds < 60) return 'just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`
  return `${Math.floor(diffInDays / 30)}mo ago`
}

export const DateCell: React.FC<TableCellProps> = ({ row, field = 'updatedAt', value }) => {
  const rawDate = value !== undefined ? value : (field ? row?.[field] : null)
  if (!rawDate) return <span style={{ color: '#64748b' }}>—</span>

  const date = new Date(rawDate as string | number)
  if (isNaN(date.getTime())) return <span style={{ color: '#64748b' }}>—</span>

  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const relativeTime = getRelativeTime(date)

  return (
    <div className="ut-date-cell">
      <span className="ut-date-primary">{formattedDate}</span>
      {relativeTime && <span className="ut-date-secondary">{relativeTime}</span>}
    </div>
  )
}

