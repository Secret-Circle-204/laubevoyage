'use client'

import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && <div className="absolute left-3.5 text-muted pointer-events-none">{icon}</div>}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`w-full px-4 py-2.5 rounded-xl border bg-card text-foreground placeholder:text-muted/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
                : 'border-border focus:ring-secondary/20 focus:border-secondary'
            } ${className}`}
            {...props}
          />
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

Input.displayName = 'Input'
