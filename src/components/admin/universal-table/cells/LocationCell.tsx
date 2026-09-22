import React from 'react'
import type { TableCellProps } from '../types'

export const LocationCell: React.FC<TableCellProps> = ({ row, field = 'city' }) => {
  const cityVal = row?.[field]
  let cityName = '—'

  if (typeof cityVal === 'object' && cityVal !== null) {
    cityName = (cityVal as any).name || (cityVal as any).title || String((cityVal as any).id || '—')
  } else if (typeof cityVal === 'string' || typeof cityVal === 'number') {
    cityName = String(cityVal)
  }

  return (
    <div className="ut-location-cell">
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span style={{ textTransform: 'capitalize' }}>{cityName}</span>
    </div>
  )
}
