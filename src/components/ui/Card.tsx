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
  const baseClasses = 'rounded-2xl border transition-all duration-500 overflow-hidden'

  const variantClasses = {
    flat: 'bg-white border-slate-200/80 dark:bg-[#1a1718] dark:border-white/10 text-slate-900 dark:text-slate-100',
    elevated: 'bg-white border-slate-100 shadow-xl dark:bg-[#1a1718] dark:border-white/10 dark:shadow-2xl text-slate-900 dark:text-slate-100',
    glass: 'bg-white/80 backdrop-blur-md border-white/20 shadow-xl dark:bg-[#1a1718]/80 dark:border-white/15 text-slate-900 dark:text-slate-100',
    interactive: 'bg-white border-slate-200/80 hover-lift hover:shadow-2xl hover:border-[#00aeef]/50 cursor-pointer dark:bg-[#1a1718] dark:border-white/10 dark:hover:border-[#00aeef]/40 text-slate-900 dark:text-slate-100',
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
