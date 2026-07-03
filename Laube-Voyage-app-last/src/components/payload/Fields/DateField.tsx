'use client'
import React, { useMemo } from 'react'
import { useField } from '@payloadcms/ui'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FieldWrapper } from './FieldWrapper'
import { Calendar } from 'lucide-react'
import type { FieldConfig, FieldAdminConfig } from './types'

/**
 * DateField — Adaptive date/time input with formatted preview badge.
 */
export const DateField: React.FC<{
  path: string

  field?: FieldConfig
  readOnly?: boolean
}> = (props) => {
  const { path, field: clientField, readOnly } = props
  const label = typeof clientField?.label === 'string' ? clientField.label : undefined
  const desc = clientField?.admin?.description
  const description = typeof desc === 'string' ? desc : undefined
  const required = clientField?.required
  const pickerAppearance =
    (clientField?.admin as (FieldAdminConfig & { date?: { pickerAppearance?: string } }))?.date
      ?.pickerAppearance || 'dayAndTime'

  const { value, setValue } = useField<string>({ path })

  const inputType = useMemo(() => {
    switch (pickerAppearance) {
      case 'timeOnly':
        return 'time'
      case 'dayOnly':
      case 'monthOnly':
        return 'date'
      default:
        return 'datetime-local'
    }
  }, [pickerAppearance])

  const formatted = useMemo(() => {
    if (!value) return null
    try {
      const d = new Date(value)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(inputType !== 'date' ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    } catch {
      return null
    }
  }, [value, inputType])

  return (
    <FieldWrapper
      path={path}
      label={label}
      description={description}
      required={required}
      icon={Calendar}
      headerExtra={
        formatted ? (
          <Badge variant="secondary" className="text-xs">
            {formatted}
          </Badge>
        ) : null
      }
    >
      <Input
        type={inputType}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setValue(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
      />
    </FieldWrapper>
  )
}

export default DateField
