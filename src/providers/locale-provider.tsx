'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Locale = 'ar' | 'en' | 'fr'
type Direction = 'rtl' | 'ltr'

interface LocaleContextType {
  locale: Locale
  direction: Direction
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [direction, setDirection] = useState<Direction>(initialLocale === 'ar' ? 'rtl' : 'ltr')

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    setDirection(dir)
    document.documentElement.setAttribute('lang', locale)
    document.documentElement.setAttribute('dir', dir)
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('laube-locale', newLocale)
    document.cookie = `laube-locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <LocaleContext.Provider value={{ locale, direction, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
