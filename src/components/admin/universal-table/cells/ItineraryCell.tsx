'use client'

import React from 'react'
import type { CellRendererProps } from '../types'

export const ItineraryCell: React.FC<CellRendererProps> = ({ value }) => {
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-xs text-slate-500">None</span>
  }

  const count = value.length
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
      {count} {count === 1 ? 'Day' : 'Days'}
    </span>
  )
}
