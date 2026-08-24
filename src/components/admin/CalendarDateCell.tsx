'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

function formatCalendarDate(cellData: unknown, timezone: string): string {
  if (!cellData) return '—'

  // If it's already a clean YYYY-MM-DD string
  if (typeof cellData === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cellData)) {
    return cellData
  }

  const date = typeof cellData === 'string' ? new Date(cellData) : (cellData as Date)
  if (isNaN(date.getTime())) {
    return String(cellData)
  }

  try {
    // Format using destination timezone so local calendar date is preserved without browser shift
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)

    const year = parts.find((p) => p.type === 'year')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value

    if (year && month && day) {
      return `${year}-${month}-${day}`
    }

    return date.toISOString().split('T')[0]
  } catch {
    return date.toISOString().split('T')[0]
  }
}

/**
 * Custom Admin Cell for Calendar Dates (startDate, endDate)
 * Formats strictly as YYYY-MM-DD in the destination timezone,
 * preventing any browser-local timezone shift (e.g. converting Aug 25 into Aug 24 in UTC-9).
 */
export const CalendarDateCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData }) => {
  if (!cellData) {
    return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
  }

  // If cellData is directly a YYYY-MM-DD string
  if (typeof cellData === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cellData)) {
    return <span>{cellData}</span>
  }

  const timezone = rowData?.destinationTimezone
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    const rawIso = typeof cellData === 'string' ? cellData.split('T')[0] : (cellData as Date).toISOString().split('T')[0]
    return <span title="Missing destinationTimezone snapshot">{rawIso}</span>
  }

  const formatted = formatCalendarDate(cellData, timezone)

  return <span>{formatted}</span>
}
