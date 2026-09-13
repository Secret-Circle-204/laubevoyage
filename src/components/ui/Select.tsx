'use client'

import React from 'react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  icon?: React.ReactNode
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, icon, className = '', id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = error && selectId ? `${selectId}-error` : undefined

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && <div className="absolute left-3.5 text-muted pointer-events-none">{icon}</div>}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`w-full px-4 py-2.5 rounded-xl border bg-card text-foreground text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10 cursor-pointer ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
                : 'border-border focus:ring-secondary/20 focus:border-secondary'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-card text-foreground">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Native dropdown chevron */}
          <div className="absolute right-3.5 pointer-events-none text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <span id={errorId} className="text-xs text-rose-500 font-medium">
            {error}
          </span>
        )}
        {!error && helperText && <span className="text-xs text-muted">{helperText}</span>}
      </div>
    )
  },
)

Select.displayName = 'Select'
