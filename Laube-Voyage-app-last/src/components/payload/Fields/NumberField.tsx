'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FieldWrapper, FIELD_INPUT_STYLE } from './FieldWrapper'
import type { FieldConfig } from './types'

/**
 * NumberField — Simple number input with prefix/suffix (like currency).
 */
export const NumberField: React.FC<{
  path: string

  field?: FieldConfig
  readOnly?: boolean
}> = (props) => {
  const { path, field: clientField, readOnly } = props
  const label = typeof clientField?.label === 'string' ? clientField.label : undefined
  const desc = clientField?.admin?.description
  const description = typeof desc === 'string' ? desc : undefined
  const placeholder = clientField?.admin?.placeholder
  const required = clientField?.required

  const custom = clientField?.admin?.custom as { prefix?: string; suffix?: string } | undefined
  const prefix = custom?.prefix
  const suffix = custom?.suffix

  const { value, setValue } = useField<number>({ path })

  return (
    <FieldWrapper
      path={path}
      label={label}
      description={description}
      required={required}
      width={clientField?.admin?.width}
    >
      <div className="relative group">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-(--theme-elevation-500) font-bold text-sm pointer-events-none">
            {prefix}
          </div>
        )}
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            setValue(val)
          }}
          placeholder={placeholder || `Enter ${label ?? 'number'}...`}
          readOnly={readOnly}
          disabled={readOnly}
          className={cn(
            `h-14 bg-transparent border-(--theme-elevation-150) !focus-visible:border-[#f58220] !focus-visible:ring-2 !focus-visible:ring-[#f58220]/40 focus:outline-none transition-all duration-200 rounded-lg shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${
              prefix ? 'pl-8' : ''
            } ${suffix ? 'pr-12' : ''}`,
            FIELD_INPUT_STYLE,
          )}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-(--theme-elevation-500) font-bold text-xs pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}

export default NumberField
