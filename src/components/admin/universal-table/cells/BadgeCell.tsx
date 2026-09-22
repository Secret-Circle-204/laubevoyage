import React from 'react'
import type { TableCellProps } from '../types'

export const BadgeCell: React.FC<TableCellProps> = ({ row, field = 'type' }) => {
  const rawVal = row?.[field]

  // Type badge (Package vs Daily Tour)
  if (field === 'type' || rawVal === 'package' || rawVal === 'daily_tour') {
    const isDaily = String(rawVal).toLowerCase().includes('daily')
    const label = isDaily ? 'Daily Tour' : 'Package'

    return (
      <span className={`ut-badge ${isDaily ? 'ut-badge-daily' : 'ut-badge-package'}`}>
        {label}
      </span>
    )
  }

  // Availability status badge (Available vs Unavailable)
  if (field === 'availability' || typeof rawVal === 'boolean' || rawVal === 'available' || rawVal === 'unavailable') {
    const isAvailable = rawVal === 'available' || rawVal === true
    const label = isAvailable ? 'Available' : 'Unavailable'

    return (
      <span className={`ut-badge ${isAvailable ? 'ut-badge-available' : 'ut-badge-unavailable'}`}>
        <span className={`ut-badge-dot ${isAvailable ? 'available' : 'unavailable'}`} />
        {label}
      </span>
    )
  }

  // Generic badge fallback
  return (
    <span className="ut-badge" style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#cbd5e1' }}>
      {String(rawVal ?? '—')}
    </span>
  )
}
