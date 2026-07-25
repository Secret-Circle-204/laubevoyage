'use client'

import React from 'react'
import type { ConvertedPrice } from '@/domains/currency/types'

export interface CurrencyDisplayProps {
  price: ConvertedPrice
  originalPrice?: ConvertedPrice
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showOriginal?: boolean
  className?: string
}

/**
 * Pure Presentational Currency Display Component.
 * Receives the fully converted and formatted price DTO from the Pricing Domain,
 * ensuring zero client-side calculation or localized formatting logic leakage.
 */
export function CurrencyDisplay({
  price,
  originalPrice,
  size = 'md',
  showOriginal = false,
  className = '',
}: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-3xl font-extrabold tracking-tight',
  }

  return (
    <div className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {showOriginal && originalPrice && originalPrice.convertedAmount > price.convertedAmount && (
        <span className="text-xs sm:text-sm line-through text-slate-400 font-medium mr-1">
          {originalPrice.formatted}
        </span>
      )}
      <span className={`${sizeClasses[size]} text-[#2e3192] dark:text-[#00aeef]`}>
        {price.formatted}
      </span>
    </div>
  )
}
