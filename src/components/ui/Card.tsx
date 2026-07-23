'use client'

import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'elevated' | 'glass' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  variant = 'flat',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const baseClasses = 'rounded-2xl border transition-all duration-300 overflow-hidden'

  const variantClasses = {
    flat: 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800',
    elevated: 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none',
    glass: 'bg-white/80 backdrop-blur-md border-white/20 shadow-xl shadow-indigo-950/5 dark:bg-slate-900/80 dark:border-slate-800/80',
    interactive: 'bg-white border-slate-200 hover-lift hover:shadow-xl hover:border-[#00aeef]/40 cursor-pointer dark:bg-slate-900 dark:border-slate-800',
  }

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`} {...props}>
      {children}
    </div>
  )
}
