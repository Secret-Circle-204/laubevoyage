'use client'

import React from 'react'

import { formatDate } from './PeekSection'

interface PeekHeaderProps {
  title: string
  subtitle?: string | null
  collectionSlug?: string
  kicker?: string
  status?: string | boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  docId?: string | number | null
  onPrint?: () => void
  onClose: () => void
}

export const PeekHeader: React.FC<PeekHeaderProps> = ({
  title,
  subtitle,
  collectionSlug = '',
  kicker,
  status,
  createdAt,
  updatedAt,
  docId,
  onPrint,
  onClose,
}) => {
  // Format collection kicker safely and generically
  const slug = (collectionSlug || '').trim().toLowerCase()
  const displayKicker =
    kicker ||
    (slug
      ? (slug.endsWith('s') && !slug.endsWith('ss') ? slug.slice(0, -1) : slug)
          .split(/[-_]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ')
      : 'Record')

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

  const formattedCreated = formatDate(createdAt)
  const formattedUpdated = formatDate(updatedAt)

  return (
    <div className="ut-peek-header">
      <div className="ut-peek-header-top">
        <div className="ut-peek-header-main-left">
          <div className="ut-peek-header-icon-box" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>

          <div className="ut-peek-header-info">
            <div className="ut-peek-meta">
              <span className="ut-peek-kicker">{displayKicker}</span>
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
        </div>

        <div className="ut-peek-header-right">
          <div className="ut-peek-header-actions print-hide">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="ut-peek-header-action-btn ut-peek-print-btn"
                title="Print Booking Record"
                id="peek-header-print-btn"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>Print</span>
              </button>
            )}

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

          {(formattedCreated || formattedUpdated || docId != null) && (
            <div className="ut-peek-header-system-meta print-hide">
              {formattedCreated && <span>Created {formattedCreated}</span>}
              {formattedUpdated && (
                <>
                  <span className="ut-peek-meta-bullet">•</span>
                  <span>Last updated {formattedUpdated}</span>
                </>
              )}
              {docId != null && (
                <>
                  <span className="ut-peek-meta-bullet">•</span>
                  <span>ID {docId}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

