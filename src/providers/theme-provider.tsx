'use client'

import React, { createContext, useContext, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const listeners = new Set<() => void>()

function getThemeSnapshot(): Theme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('laube-theme') as Theme) || 'dark'
  }
  return 'dark'
}

function getThemeServerSnapshot(): Theme {
  return 'dark'
}

function subscribeTheme(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'laube-theme') {
      const newTheme = (event.newValue as Theme) || 'dark'
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
      onStoreChange()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
  }
  return () => {
    listeners.delete(onStoreChange)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage)
    }
  }
}

function updateTheme(newTheme: Theme) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('laube-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  listeners.forEach((listener) => listener())
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const setTheme = (newTheme: Theme) => {
    updateTheme(newTheme)
  }

  const toggleTheme = () => {
    updateTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
