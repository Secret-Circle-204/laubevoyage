'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FieldWrapper, FIELD_INPUT_STYLE } from './FieldWrapper'
import type { FieldConfig } from './types'

/**
 * TextField — Simple, clean text input.
 */
export const TextField: React.FC<{
  path: string

  field?: FieldConfig
  readOnly?: boolean
}> = (props) => {
  const { path, field: clientField, readOnly } = props
  const label = typeof clientField?.label === 'string' ? clientField.label : undefined
  const desc = clientField?.admin?.description
  const description = typeof desc === 'string' ? desc : undefined
  const ph = clientField?.admin?.placeholder
  const placeholder = typeof ph === 'string' ? ph : undefined
  const maxLength = typeof clientField?.maxLength === 'number' ? clientField.maxLength : undefined
  const required = clientField?.required

  const { value, setValue } = useField<string>({ path })
  const stringVal = typeof value === 'string' ? value : ''

  return (
    <FieldWrapper
      path={path}
      label={label}
      description={description}
      required={required}
      width={typeof clientField?.admin?.width === 'string' ? clientField.admin?.width : undefined}
    >
      <Input
        value={stringVal}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || `Enter ${label ?? 'text'}...`}
        maxLength={maxLength}
        readOnly={readOnly}
        disabled={readOnly}
        className={cn(
          'h-14 bg-transparent border-(--theme-elevation-150) !focus-visible:border-[#f58220] !focus-visible:ring-2 !focus-visible:ring-[#f58220]/40 focus:outline-none transition-all duration-200 rounded-lg shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]',
          FIELD_INPUT_STYLE,
        )}
      />
    </FieldWrapper>
  )
}

export default TextField
