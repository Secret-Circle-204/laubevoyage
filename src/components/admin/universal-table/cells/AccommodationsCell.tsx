'use client'

import React from 'react'
import type { CellRendererProps } from '../types'

export const AccommodationsCell: React.FC<CellRendererProps> = ({ value, row }) => {
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-xs text-slate-500">None</span>
  }

  const stayCount = value.length
  const totalNights = value.reduce((sum: number, stay: unknown) => {
    const nights = typeof stay === 'object' && stay !== null && 'nights' in stay ? Number((stay as { nights?: unknown }).nights) : 0
    return sum + (Number.isFinite(nights) ? nights : 0)
  }, 0)

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{
          backgroundColor: '#181a52',
          color: '#ffffff',
          border: '1px solid #3c40a4',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
      >
        {stayCount} {stayCount === 1 ? 'Stay' : 'Stays'}
      </span>
      {totalNights > 0 && (
        <span className="text-xs text-slate-400">
          ({totalNights} {totalNights === 1 ? 'nt' : 'nts'})
        </span>
      )}
    </div>
  )
}
