'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark') // Default is dark
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('laube-theme') as Theme | null
    if (savedTheme) {
      setThemeState(savedTheme)
    }
    setMounted(true)
  }, [])

  // Update localStorage and document class when theme changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('laube-theme', theme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  // To prevent hydration mismatch, we must ensure that the theme provided 
  // on the first client render matches the server render ('dark').
  // By always returning the theme state which is initialized to 'dark', 
  // and only updating it in useEffect (which runs after hydration), 
  // we maintain consistency.

  return (
    <ThemeContext.Provider value={{ 
      theme: mounted ? theme : 'dark', 
      toggleTheme, 
      setTheme,
      mounted 
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme colors export for components
export const themeColors = {
  dark: {
    bg: '#231F20',
    bgAlt: '#1a1718',
    text: '#FFFFFF',
    textMuted: '#A7AAAC',
    primary: '#F58220',
    secondary: '#00AEEF',
    accent: '#2E3192',
    border: 'rgba(167, 170, 172, 0.1)',
  },
  light: {
    bg: '#FAFAFA',
    bgAlt: '#FFFFFF',
    text: '#231F20',
    textMuted: '#666666',
    primary: '#F58220',
    secondary: '#2E3192',
    accent: '#00AEEF',
    border: 'rgba(35, 31, 32, 0.1)',
  }
}
