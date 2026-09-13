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
    flat: 'bg-card border-border text-foreground',
    elevated: 'bg-card border-border shadow-xl dark:shadow-2xl text-foreground',
    glass: 'bg-card/80 backdrop-blur-md border-border/80 shadow-xl text-foreground',
    interactive:
      'bg-card border-border hover-lift hover:shadow-2xl hover:border-secondary/50 cursor-pointer dark:hover:border-secondary/40 text-foreground',
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
