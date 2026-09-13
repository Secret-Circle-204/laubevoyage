'use client'

import React from 'react'
import { Spinner } from './Skeleton'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'glass'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary dark:focus-visible:ring-offset-background focus-visible:ring-offset-2'

    const variantClasses = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-dark shadow-md hover:shadow-lg shadow-primary/20 hover-lift',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary-dark shadow-md hover:shadow-lg shadow-secondary/20 hover-glow',
      accent:
        'bg-accent text-accent-foreground hover:bg-accent-dark shadow-md hover:shadow-lg shadow-accent/25 hover-scale',
      outline:
        'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:border-secondary dark:text-secondary dark:hover:bg-secondary dark:hover:text-secondary-foreground',
      ghost: 'text-primary hover:bg-primary/10 dark:text-secondary dark:hover:bg-secondary/10',
      glass:
        'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-lg',
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
      xl: 'px-8 py-4 text-lg gap-3',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <Spinner size={size === 'sm' ? 'sm' : 'md'} className="-ml-1 mr-2 text-current" />
        )}
        {!isLoading && icon && iconPosition === 'left' && <span className="inline-flex">{icon}</span>}
        <span>{children}</span>
        {!isLoading && icon && iconPosition === 'right' && <span className="inline-flex">{icon}</span>}
      </button>
    )
  },
)

Button.displayName = 'Button'
