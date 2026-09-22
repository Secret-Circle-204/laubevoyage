import React from 'react'
import type { TableCellProps } from '../types'

export const PriceCell: React.FC<TableCellProps> = ({ row, field = 'price' }) => {
  const priceVal = row?.[field]
  let num = 0
  let currency = 'EGP'

  if (typeof priceVal === 'number') {
    num = priceVal
  } else if (typeof priceVal === 'string') {
    num = parseFloat(priceVal) || 0
  } else if (typeof priceVal === 'object' && priceVal !== null) {
    num = Number((priceVal as any).basePrice || (priceVal as any).amount || 0)
    currency = (priceVal as any).currency
  }

  const formatted = num.toLocaleString('en-US')

  return (
    <div className="ut-price-cell">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
      </svg>
      <span>{formatted}</span>
      <span className="ut-price-currency">{currency}</span>
    </div>
  )
}
