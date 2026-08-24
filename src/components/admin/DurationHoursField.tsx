'use client'

import React, { useCallback, useMemo } from 'react'
import { useField } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'

/**
 * Admin UX Component: Duration in Hours Field
 *
 * Facilitates human-friendly entry in Hours (e.g. 3, 1.5, 4.5, 7) while
 * maintaining single source of truth storage in integer minutes (180, 90, 270, 420)
 * in PostgreSQL duration_duration_minutes.
 *
 * Deterministic conversion:
 *   - Display: minutes / 60
 *   - Storage: hours * 60
 *   - No business logic: minimums and validation remain in Schema/Domain.
 */
export const DurationHoursField: NumberFieldClientComponent = (props) => {
  const { path, readOnly } = props
  const { value, setValue, errorMessage } = useField<number>({ path })

  // Deterministic conversion: DB minutes -> Admin hours (180 -> 3, 90 -> 1.5)
  const hoursValue = useMemo(() => {
    if (typeof value !== 'number' || isNaN(value) || value <= 0) {
      return ''
    }
    const hours = value / 60
    return String(hours)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawStr = e.target.value.trim()
      if (rawStr === '') {
        setValue(null)
        return
      }

      const parsedHours = Number(rawStr)
      if (isNaN(parsedHours) || parsedHours <= 0) {
        setValue(null)
        return
      }

      // Deterministic conversion: hours * 60 -> integer minutes
      const exactMinutes = parsedHours * 60
      const integerMinutes = Math.round(exactMinutes)

      setValue(integerMinutes)
    },
    [setValue],
  )

  const minutesDisplay = typeof value === 'number' && value > 0 ? `${value} minutes` : 'Not set'

  return (
    <div className="field-type number duration-hours-field" style={{ marginBottom: '1.25rem' }}>
      <label className="field-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
        Tour Duration (Hours)
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="number"
          step="0.25"
          min="0.25"
          value={hoursValue}
          onChange={handleChange}
          disabled={readOnly}
          placeholder="e.g. 3 for 3 hours, 1.5 for 90 minutes"
          style={{
            width: '260px',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--theme-elevation-200, #ccc)',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-600, #666)' }}>
          Hours (stored in database as: <strong>{minutesDisplay}</strong>)
        </span>
      </div>
      {errorMessage && (
        <div style={{ color: 'var(--theme-error-500, #e53e3e)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}
