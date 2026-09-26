import React from 'react'
import type { TableCellProps } from '../types'

export const BadgeCell: React.FC<TableCellProps> = ({ row, field = 'type', value }) => {
  const rawVal = value !== undefined ? value : (field ? row?.[field] : null)

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

  // Generic status formatting with semantic color classes
  const statusStr = String(rawVal || '').toLowerCase()
  let badgeClass = 'ut-badge-neutral'
  let label = String(rawVal ?? '—')

  if (['confirmed', 'active', 'published', 'paid', 'completed'].includes(statusStr)) {
    badgeClass = 'ut-badge-success'
    label = statusStr === 'confirmed' ? 'Confirmed' : statusStr === 'completed' ? 'Completed' : label
  } else if (['pending', 'pending_admin_review', 'partially_paid', 'draft'].includes(statusStr)) {
    badgeClass = 'ut-badge-warning'
    label = statusStr === 'pending_admin_review' ? 'Pending Review' : label
  } else if (['cancelled', 'refunded', 'inactive', 'archived', 'unpaid'].includes(statusStr)) {
    badgeClass = 'ut-badge-danger'
    label = statusStr === 'cancelled' ? 'Cancelled' : statusStr === 'refunded' ? 'Refunded' : label
  }

  return (
    <span className={`ut-badge ${badgeClass}`}>
      {label}
    </span>
  )
}
