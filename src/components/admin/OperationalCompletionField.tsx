'use client'

import React from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { DateFieldClientComponent } from 'payload'

function AlertTriangleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/**
 * Custom Admin Field for Operational Completion
 * Renders completionAt formatted in the destination timezone (e.g. Africa/Cairo)
 * alongside the frozen UTC instant for complete operational clarity.
 */
export const OperationalCompletionField: DateFieldClientComponent = (props) => {
  const { path } = props
  const { value } = useField<string>({ path })

  // Retrieve destinationTimezone from form state
  const destinationTimezoneField = useFormFields(([fields]) => fields.destinationTimezone)
  const timezone = destinationTimezoneField?.value as string | undefined

  if (!value) {
    return (
      <div className="field-type date" style={{ marginBottom: '1.25rem' }}>
        <label className="field-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          Operational Completion
        </label>
        <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.875rem' }}>Not calculated yet</div>
      </div>
    )
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return (
      <div className="field-type date" style={{ marginBottom: '1.25rem' }}>
        <label className="field-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          Operational Completion
        </label>
        <div style={{ color: 'var(--theme-error-500)', fontSize: '0.875rem' }}>Invalid Date ({String(value)})</div>
      </div>
    )
  }

  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return (
      <div className="field-type date" style={{ marginBottom: '1.25rem' }}>
        <label className="field-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          Operational Completion (Missing Timezone)
        </label>
        <div
          style={{
            padding: '0.6rem 0.85rem',
            borderRadius: '4px',
            border: '1px solid var(--theme-error-400)',
            backgroundColor: 'var(--theme-error-50)',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'var(--theme-error-700)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AlertTriangleIcon />
            <span>Missing destinationTimezone snapshot</span>
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
            Frozen UTC: {date.toISOString()}
          </div>
        </div>
      </div>
    )
  }

  let localDisplay = value
  try {
    localDisplay = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    localDisplay = date.toISOString()
  }

  return (
    <div className="field-type date" style={{ marginBottom: '1.25rem' }}>
      <label className="field-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
        Operational Completion ({timezone})
      </label>
      <div
        style={{
          padding: '0.6rem 0.85rem',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-200)',
          backgroundColor: 'var(--theme-elevation-50)',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        <div>{localDisplay}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500)', marginTop: '0.35rem' }}>
          Frozen UTC: {date.toISOString()}
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)', marginTop: '0.25rem' }}>
        Frozen operational moment when the tour/package finishes physical execution in destination timezone.
      </div>
    </div>
  )
}
