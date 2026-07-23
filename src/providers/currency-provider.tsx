'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

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
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency)

  useEffect(() => {
    const savedCurrency = (localStorage.getItem('laube-currency') as CurrencyCode) || initialCurrency
    setCurrencyState(savedCurrency)
  }, [initialCurrency])

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('laube-currency', newCurrency)
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
