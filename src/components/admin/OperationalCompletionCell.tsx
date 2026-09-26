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

function AlertTriangleIcon() {
  return (
    <svg style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
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
        style={{
          color: 'var(--theme-error-500)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
        title={`Data Contract Violation: Missing destinationTimezone snapshot on Booking #${rowData?.bookingNumber || rowData?.id || ''}. Frozen UTC: ${date.toISOString()}`}
      >
        <AlertTriangleIcon />
        <span>No Timezone</span>
      </span>
    )
  }

  const { formatted, isError } = formatCompletionDate(date, timezone)

  const title = isError
    ? `Invalid IANA Timezone (${timezone}) | Frozen UTC: ${date.toISOString()}`
    : `Frozen UTC: ${date.toISOString()} | Timezone: ${timezone}`

  return <span title={title}>{formatted}</span>
}
