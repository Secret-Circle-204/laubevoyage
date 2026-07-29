'use client'

import React from 'react'
import { ThemeProvider } from './theme-provider'
import { LocaleProvider } from './locale-provider'
import { CurrencyProvider } from './currency-provider'
import { ToastProvider } from './toast-provider'
import { SessionProvider, type CustomerSessionState } from './session-provider'

export interface AppProvidersProps {
  children: React.ReactNode
  initialLocale?: string
  initialCurrency?: string
  initialSession?: CustomerSessionState
}

/**
 * AppProviders Master Wrapper Component
 * Encapsulates ThemeProvider, LocaleProvider, CurrencyProvider, ToastProvider, and SessionProvider.
 * Keeps RootLayout clean and concise.
 */
export function AppProviders({
  children,
  initialLocale = 'en',
  initialCurrency = 'EGP',
  initialSession = { isAuthenticated: false },
}: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LocaleProvider initialLocale={initialLocale}>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <SessionProvider initialSession={initialSession}>
            <ToastProvider>{children}</ToastProvider>
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

