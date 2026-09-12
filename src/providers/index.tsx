'use client'

import React from 'react'
import { ThemeProvider } from './theme-provider'
import { LocaleProvider } from './locale-provider'
import { CurrencyProvider } from './currency-provider'
import { ToastProvider } from './toast-provider'
import { SessionProvider, type CustomerSessionState } from './session-provider'
import { LoadingProvider } from './loading-provider'
import { NavigationLoadingTracker } from '@/components/layout/NavigationLoadingTracker'
import { RouteProgressBar } from '@/components/ui/loading/RouteProgressBar'

export interface AppProvidersProps {
  children: React.ReactNode
  initialLocale?: string
  initialDirection?: 'rtl' | 'ltr'
  initialCurrency?: string
  initialSession?: CustomerSessionState
}

/**
 * AppProviders Master Wrapper Component
 * Encapsulates ThemeProvider, LocaleProvider, CurrencyProvider, LoadingProvider, ToastProvider, and SessionProvider.
 * Keeps RootLayout clean and concise.
 */
export function AppProviders({
  children,
  initialLocale = 'en',
  initialDirection = 'ltr',
  initialCurrency = 'EGP',
  initialSession = { isAuthenticated: false },
}: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LocaleProvider initialLocale={initialLocale} initialDirection={initialDirection}>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <SessionProvider initialSession={initialSession}>
            <LoadingProvider>
              <NavigationLoadingTracker />
              <RouteProgressBar />
              <ToastProvider>{children}</ToastProvider>
            </LoadingProvider>
          </SessionProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}

export { useTheme } from './theme-provider'
export { useLocale } from './locale-provider'
export { useCurrency } from './currency-provider'
export { useToast } from './toast-provider'
export { useSession } from './session-provider'
export { useGlobalLoading } from './loading-provider'

