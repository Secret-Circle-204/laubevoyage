'use client'

import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline' | 'glass'
  size?: 'sm' | 'md'
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-full select-none'

  const variantClasses = {
    primary: 'bg-[#2e3192]/10 text-[#2e3192] dark:bg-[#2e3192]/30 dark:text-indigo-300',
    secondary: 'bg-[#00aeef]/10 text-[#00aeef] dark:bg-[#00aeef]/30 dark:text-cyan-300',
    accent: 'bg-[#f58220]/10 text-[#f58220] dark:bg-[#f58220]/30 dark:text-amber-300',
    success: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    error: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
    outline: 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm',
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs sm:text-sm',
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </span>
  )
}
