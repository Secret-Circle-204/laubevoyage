'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED'

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (currency: CurrencyCode) => void
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({
  children,
  initialCurrency = 'EGP',
}: {
  children: React.ReactNode
  initialCurrency?: CurrencyCode
}) {
  const router = useRouter()
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency)

  useEffect(() => {
    const savedCurrency = (localStorage.getItem('laube-currency') as CurrencyCode) || initialCurrency
    setCurrencyState(savedCurrency)
  }, [initialCurrency])

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('laube-currency', newCurrency)
    document.cookie = `laube-currency=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
