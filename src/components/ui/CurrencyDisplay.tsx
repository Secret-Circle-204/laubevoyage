'use client'

import React from 'react'
import { useCurrency } from '@/providers'

export interface CurrencyDisplayProps {
  amountEGP: number
  displayAmount?: number
  displayCurrency?: string
  originalAmountEGP?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showOriginal?: boolean
  className?: string
}

export function CurrencyDisplay({
  amountEGP,
  displayAmount,
  displayCurrency,
  originalAmountEGP,
  size = 'md',
  showOriginal = false,
  className = '',
}: CurrencyDisplayProps) {
  const { currency: activeCurrency } = useCurrency()

  const currencyCode = displayCurrency || activeCurrency || 'EGP'
  const amount = displayAmount !== undefined ? displayAmount : amountEGP

  const symbolMap: Record<string, string> = {
    EGP: 'EGP',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    AED: 'AED',
  }

  const symbol = symbolMap[currencyCode] || currencyCode

  const sizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-3xl font-extrabold tracking-tight',
  }

  return (
    <div className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {showOriginal && originalAmountEGP && originalAmountEGP > amountEGP && (
        <span className="text-xs sm:text-sm line-through text-slate-400 font-medium">
          {symbol} {originalAmountEGP.toLocaleString()}
        </span>
      )}

      <span className={`${sizeClasses[size]} text-[#2e3192] dark:text-[#00aeef]`}>
        <span className="text-xs font-semibold mr-1">{symbol}</span>
        {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}
