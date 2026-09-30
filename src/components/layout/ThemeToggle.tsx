'use client'

import React, { useSyncExternalStore } from 'react'
import { useTheme } from '@/providers/theme-provider'

const emptySubscribe = () => () => {}

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export interface ThemeToggleProps {
  className?: string
  variant?: 'header' | 'sheet'
}

export function ThemeToggle({ className = '', variant = 'header' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  if (!mounted) {
    return <div className={`w-9 h-9 rounded-full ${className}`} aria-hidden="true" />
  }

  const isDark = theme === 'dark'
  const isSheet = variant === 'sheet'

  const buttonStyle = isSheet
    ? 'border border-border/80 bg-card text-foreground hover:bg-border/30 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-border/30'
    : 'border border-white/30 bg-white/20 text-white hover:bg-white/30 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-border/30'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`p-2 rounded-full hover:shadow-xs transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 dark:focus-visible:ring-secondary cursor-pointer ${buttonStyle} ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        /* Sun Icon - Solar Amber micro-twist */
        <svg
          className="w-5 h-5 text-accent transition-all duration-300 rotate-0 hover:rotate-45 hover:scale-105"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        /* Moon Icon */
        <svg
          className={`w-5 h-5 transition-all duration-300 -rotate-12 hover:rotate-0 hover:scale-105 ${
            isSheet ? 'text-foreground/80 hover:text-foreground' : 'text-white dark:text-secondary'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}
