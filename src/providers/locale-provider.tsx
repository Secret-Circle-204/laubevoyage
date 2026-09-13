// app/providers/locale-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLocaleAction } from '@/application/actions/customer-actions'
import { useOptionalGlobalLoading } from './loading-provider'

type Locale = string
type Direction = 'rtl' | 'ltr'

interface LocaleContextType {
  locale: Locale
  direction: Direction
  setLocale: (locale: Locale) => Promise<void>
  isPending: boolean
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({
  children,
  initialLocale = 'en',
  initialDirection = 'ltr',
}: {
  children: React.ReactNode
  initialLocale?: Locale
  initialDirection?: Direction
}) {
  const router = useRouter()
  const loading = useOptionalGlobalLoading()
  const [isPending, startTransition] = useTransition()

  const direction: Direction = initialDirection
  const isSwitchingRef = useRef<boolean>(false)
  const wasPendingRef = useRef<boolean>(false)
  const loadingRef = useRef(loading)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    document.documentElement.setAttribute('lang', initialLocale)
    document.documentElement.setAttribute('dir', initialDirection)
  }, [initialLocale, initialDirection])

  // Track the transition completion lifecycle:
  // Stop is ONLY called when:
  // 1. A real switch was in flight (isSwitchingRef.current === true)
  // 2. The transition was actively in pending state (wasPendingRef.current === true)
  // 3. React has now finished reconciling the RSC payload and committed to DOM (isPending === false)
  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true
    } else if (wasPendingRef.current && isSwitchingRef.current) {
      wasPendingRef.current = false
      isSwitchingRef.current = false
      loadingRef.current?.stop('locale:switch')
    }
  }, [isPending])

  // Safety cleanup: runs ONLY when LocaleProvider is unmounted
  useEffect(() => {
    return () => {
      if (isSwitchingRef.current) {
        isSwitchingRef.current = false
        wasPendingRef.current = false
        loadingRef.current?.stop('locale:switch')
      }
    }
  }, [])

  const setLocale = async (newLocale: Locale) => {
    // Guard 1: Prevent switching to the currently active locale
    // Guard 2: Prevent concurrent duplicate clicks while a switch or transition is already in flight
    if (newLocale === initialLocale || isSwitchingRef.current || isPending) {
      return
    }

    isSwitchingRef.current = true
    wasPendingRef.current = false

    // Start global loading operation with dedicated dedupeKey
    loading?.start({
      dedupeKey: 'locale:switch',
      type: 'navigation',
      level: 1,
    })

    try {
      const result = await setLocaleAction(newLocale)
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to update locale cookie')
      }

      // Persist in localStorage only after server cookie action succeeds
      localStorage.setItem('laube-locale', newLocale)

      // Initiate Next.js Server Component refresh inside React transition
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      // Error recovery path: immediately restore flags and stop loading so the UI never hangs
      isSwitchingRef.current = false
      wasPendingRef.current = false
      loading?.stop('locale:switch')
      console.error('[LocaleProvider] Failed to switch locale:', error)
    }
  }

  return (
    <LocaleContext.Provider value={{ locale: initialLocale, direction, setLocale, isPending }}>
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

