'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface FieldWrapperProps {
  path: string
  label?: string
  description?: string
  required?: boolean
  icon?: LucideIcon
  className?: string
  children: React.ReactNode
  /** Show character count */
  charCount?: number
  maxLength?: number
  /** Extra content in the header row (right side) */
  headerExtra?: React.ReactNode
  /** Style override */
  style?: React.CSSProperties
  /** Width from Payload field config */
  width?: string
  /** Styling variant: 'minimal' (no border/bg) or 'card' (with border/bg/padding) */
  variant?: 'minimal' | 'card'
}

/**
 * Centralized styles for Field Titles/Labels
 * Change this line to update the font, size, and weight for all fields
 */
export const FIELD_TITLE_STYLE = 'text-xl font-semibold  '

/**
 * Centralized styles for Field Inputs
 * Change this line to update the font, size, and weight for the text inside inputs
 */
export const FIELD_INPUT_STYLE = '!text-base font-normal  '

/**
 * FieldWrapper — Premium styled wrapper for all custom fields.
 * Provides a card-like container with icon header, description, and error display.
 */
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  path,
  label,
  description,
  required,
  icon: _Icon,
  className,
  children,
  charCount: _charCount,
  maxLength: _maxLength,
  headerExtra,
  width,
  variant = 'minimal',
}) => {
  const { errorMessage, showError } = useField({ path })

  const isCard = variant === 'card'

  return (
    <div
      className={cn(
        'relative mb-4 transition-all duration-200 flex-1 min-w-0',
        isCard &&
          'rounded-xl p-4 border border-(--theme-elevation-150) bg-(--theme-elevation-50)/50',
        className,
      )}
      style={{
        width: width || '100%',
      }}
    >
      {/* Header row */}
      {(label || headerExtra) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(FIELD_TITLE_STYLE)} style={{ color: 'var(--theme-text)' }}>
              {label}
            </span>
            {required && <span className="text-xs font-bold text-primary/80">*</span>}
          </div>

          <div className="flex items-center gap-2">{headerExtra}</div>
        </div>
      )}

      {/* Description */}
      {description && (
        <p
          className="text-xs mb-2.5 leading-relaxed"
          style={{ color: 'var(--theme-elevation-500)' }}
        >
          {description}
        </p>
      )}

      {/* Field content */}
      {children}

      {/* Error */}
      {showError && errorMessage && (
        <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-lg bg-red-500/8">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <p className="text-xs text-red-500 font-medium">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
