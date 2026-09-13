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
    primary: 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-secondary',
    secondary: 'bg-secondary/10 text-secondary dark:bg-secondary/30 dark:text-secondary',
    accent: 'bg-accent/10 text-accent dark:bg-accent/30 dark:text-accent',
    success: 'bg-secondary/10 text-secondary border border-secondary/20 dark:bg-secondary/20 dark:text-secondary',
    warning: 'bg-accent/10 text-accent border border-accent/20 dark:bg-accent/20 dark:text-accent',
    error: 'bg-accent/10 text-accent border border-accent/30 dark:bg-accent/20 dark:text-accent',
    outline: 'border border-border text-foreground',
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
