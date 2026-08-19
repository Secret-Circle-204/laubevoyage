'use client'

import React, { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { setCurrencyAction } from '@/application/actions/customer-actions'

type CurrencyCode = string

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

  const setCurrency = async (newCurrency: CurrencyCode) => {
    localStorage.setItem('laube-currency', newCurrency)
    await setCurrencyAction(newCurrency)
    router.refresh()
  }

  return (
    <CurrencyContext.Provider value={{ currency: initialCurrency, setCurrency }}>
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
