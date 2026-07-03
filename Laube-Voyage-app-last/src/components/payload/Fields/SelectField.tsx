'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'

import { FieldWrapper } from './FieldWrapper'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldConfig } from './types'

/**
 * SelectField — Native dropdown for single-select, card toggles for multi-select.
 */
export const SelectField: React.FC<{
  path: string

  field?: FieldConfig
  readOnly?: boolean
}> = (props) => {
  const { path, field: clientField, readOnly } = props
  const label = typeof clientField?.label === 'string' ? clientField.label : undefined
  const desc = clientField?.admin?.description
  const description = typeof desc === 'string' ? desc : undefined
  const required = clientField?.required
  const options = (clientField?.options as { label: string; value: string }[]) || []
  const hasMany = clientField?.hasMany

  const { value, setValue } = useField<string | string[]>({ path })

  // Multi-select: toggle card buttons
  if (hasMany) {
    const selected = Array.isArray(value) ? value : []

    const toggleOption = (optValue: string) => {
      if (readOnly) return
      const next = selected.includes(optValue)
        ? selected.filter((v) => v !== optValue)
        : [...selected, optValue]
      setValue(next)
    }

    return (
      <FieldWrapper
        path={path}
        label={label}
        description={description}
        required={required}
        icon={ChevronDown}
      >
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isActive = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOption(opt.value)}
                disabled={readOnly}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-all',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {isActive && <Check size={12} />}
                {opt.label}
              </button>
            )
          })}
        </div>
      </FieldWrapper>
    )
  }

  // Single-select: native dropdown
  return (
    <FieldWrapper
      path={path}
      label={label}
      description={description}
      required={required}
      icon={ChevronDown}
    >
      <div className="relative">
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(e.target.value)}
          disabled={readOnly}
          className={cn(
            'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm',
            'shadow-xs transition-colors outline-none appearance-none pr-8',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>
    </FieldWrapper>
  )
}

export default SelectField
