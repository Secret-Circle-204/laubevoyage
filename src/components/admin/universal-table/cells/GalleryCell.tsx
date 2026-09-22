'use client'

import React from 'react'
import type { CellRendererProps } from '../types'

export const GalleryCell: React.FC<CellRendererProps> = ({ value }) => {
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-xs text-slate-500">No photos</span>
  }

  const count = value.length
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {count} {count === 1 ? 'Photo' : 'Photos'}
    </span>
  )
}
