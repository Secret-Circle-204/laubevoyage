'use client'

import React from 'react'

interface PeekHeaderProps {
  title: string
  subtitle?: string | null
  collectionSlug?: string
  status?: string | boolean | null
  onClose: () => void
}

export const PeekHeader: React.FC<PeekHeaderProps> = ({
  title,
  subtitle,
  collectionSlug = 'experiences',
  status,
  onClose,
}) => {
  // Format collection kicker safely
  const slug = (collectionSlug || '').toLowerCase()
  const kicker =
    slug === 'experiences'
      ? 'Experience'
      : slug === 'bookings'
        ? 'Booking'
        : slug
          ? slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase()
          : 'Record'

  // Format status badge style
  const statusStr =
    typeof status === 'boolean'
      ? status
        ? 'available'
        : 'unavailable'
      : (status || '').toLowerCase()
  const isPositive =
    statusStr === 'available' ||
    statusStr === 'confirmed' ||
    statusStr === 'completed' ||
    statusStr === 'paid'
  const isWarning =
    statusStr === 'pending_admin_review' ||
    statusStr === 'pending_payment' ||
    statusStr === 'coming_soon'
  const isDanger =
    statusStr === 'sold_out' ||
    statusStr === 'cancelled' ||
    statusStr === 'refunded' ||
    statusStr === 'expired'

  const badgeClass = isPositive
    ? 'badge-success'
    : isWarning
      ? 'badge-warning'
      : isDanger
        ? 'badge-danger'
        : 'badge-neutral'

  const formattedStatus = statusStr
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="ut-peek-header">
      <div className="ut-peek-header-top">
        <div className="ut-peek-header-info">
          <div className="ut-peek-meta">
            <span className="ut-peek-kicker">{kicker}</span>
            {statusStr && (
              <span className={`ut-peek-badge ${badgeClass}`}>
                {formattedStatus}
              </span>
            )}
          </div>
          <h2 className="ut-peek-title" title={title}>
            {title || 'Untitled Document'}
          </h2>
          {subtitle && (
            <p className="ut-peek-subtitle" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ut-peek-close-btn"
          title="Close drawer (Esc)"
          aria-label="Close drawer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
