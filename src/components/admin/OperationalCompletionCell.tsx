'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'
function formatCompletionDate(date: Date, timezone: string): { formatted: string; isError: boolean } {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
    return { formatted, isError: false }
  } catch {
    return { formatted: date.toISOString(), isError: true }
  }
}

/**
 * Custom Admin Cell for Operational Completion
 * Renders completionAt in the destination timezone (e.g. Africa/Cairo -> 12:00 PM)
 * regardless of the operator browser's timezone.
 */
export const OperationalCompletionCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData }) => {
  if (!cellData) {
    return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
  }

  const date = typeof cellData === 'string' ? new Date(cellData) : (cellData as Date)
  if (isNaN(date.getTime())) {
    return <span>{String(cellData)}</span>
  }

  const timezone = rowData?.destinationTimezone
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return (
      <span
        style={{ color: 'var(--theme-error-500)', fontWeight: 600 }}
        title={`Missing destinationTimezone snapshot on Booking. Frozen UTC: ${date.toISOString()}`}
      >
        ⚠️ Missing Timezone ({date.toISOString()})
      </span>
    )
  }

  const { formatted, isError } = formatCompletionDate(date, timezone)

  const title = isError
    ? `Frozen UTC: ${date.toISOString()}`
    : `Frozen UTC: ${date.toISOString()} | Timezone: ${timezone}`

  return <span title={title}>{formatted}</span>
}
