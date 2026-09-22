'use client'

import React from 'react'
import type { CellRendererProps } from '../types'

export const AccommodationsCell: React.FC<CellRendererProps> = ({ value, row }) => {
  if (!Array.isArray(value) || value.length === 0) {
    if (row?.type === 'daily_tour') {
      return <span className="text-xs text-slate-500 italic">N/A (Daily Tour)</span>
    }
    return <span className="text-xs text-slate-500">None</span>
  }

  const stayCount = value.length
  const totalNights = value.reduce((sum: number, stay: any) => sum + (Number(stay?.nights) || 0), 0)

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
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
