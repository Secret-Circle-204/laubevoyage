'use client'

import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && <div className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</div>}

          <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 text-sm transition-all duration-200 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-white ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
                : 'border-slate-300 focus:ring-[#00aeef]/20 focus:border-[#00aeef] dark:border-slate-700'
            } ${className}`}
            {...props}
          />
        </div>

        {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500">{helperText}</span>}
      </div>
    )
  },
)

Input.displayName = 'Input'
