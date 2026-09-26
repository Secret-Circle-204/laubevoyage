'use client'

import React, { useState, useEffect } from 'react'
import { registerPeekSlot } from '../registry'
import {
  PeekSectionCard,
  FieldRow,
  formatDate,
  formatLabel,
  formatDuration,
  formatPrice,
} from './PeekSection'
import { BookingOperationalActions } from '@/components/admin/booking/BookingOperationalActions'

export interface Traveler {
  id?: string
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  passportNumber?: string | null
  nationality?: string | null
  type?: 'adult' | 'child' | 'infant' | string
}

/**
 * Focused Traveler Detail Modal:
 * Keyboard accessible, ESC-dismissible modal for full traveler inspection.
 */
export const TravelerDetailModal: React.FC<{
  traveler: Traveler | null
  onClose: () => void
}> = ({ traveler, onClose }) => {
  useEffect(() => {
    if (!traveler) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [traveler, onClose])

  if (!traveler) return null

  const fullName = [traveler.firstName, traveler.lastName].filter(Boolean).join(' ') || 'Traveler'
  const initials =
    [traveler.firstName, traveler.lastName]
      .filter(Boolean)
      .map((s) => s![0]?.toUpperCase())
      .join('') || 'TR'

  return (
    <div
      className="ut-traveler-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="ut-traveler-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ut-traveler-modal-header">
          <h3 className="ut-traveler-modal-title">Traveler Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="ut-traveler-modal-close-btn"
            title="Close (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="ut-traveler-modal-body">
          <div className="ut-traveler-modal-profile">
            <div className="ut-traveler-modal-avatar">{initials}</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {fullName}
              </h4>
              <span
                className={`ut-peek-traveler-type-badge ${
                  traveler.type === 'child'
                    ? 'is-child'
                    : traveler.type === 'infant'
                      ? 'is-infant'
                      : ''
                }`}
              >
                {formatLabel(traveler.type || 'Adult')}
              </span>
            </div>
          </div>

          <div className="ut-traveler-modal-grid">
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">First Name</span>
              <span className="ut-traveler-modal-field-value">{traveler.firstName || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Last Name</span>
              <span className="ut-traveler-modal-field-value">{traveler.lastName || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Category</span>
              <span className="ut-traveler-modal-field-value">{formatLabel(traveler.type || 'Adult')}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Date of Birth</span>
              <span className="ut-traveler-modal-field-value">{formatDate(traveler.dateOfBirth) || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Contact Email</span>
              <span className="ut-traveler-modal-field-value">{traveler.email || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Contact Phone</span>
              <span className="ut-traveler-modal-field-value">{traveler.phone || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Passport Number</span>
              <span className="ut-traveler-modal-field-value is-mono">{traveler.passportNumber || '—'}</span>
            </div>
            <div className="ut-traveler-modal-field">
              <span className="ut-traveler-modal-field-label">Nationality</span>
              <span className="ut-traveler-modal-field-value">{traveler.nationality || '—'}</span>
            </div>
          </div>
        </div>

        <div className="ut-traveler-modal-footer">
          <button type="button" onClick={onClose} className="ut-peek-btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Visual Experience Collage Component:
 * Displays hero image on left and up to 2 gallery thumbnails on right with overflow counter.
 */
const ExperienceVisualCollage: React.FC<{
  heroUrl: string | null
  galleryUrls: string[]
  title: string
}> = ({ heroUrl, galleryUrls, title }) => {
  const [heroError, setHeroError] = useState(false)
  const hasGallery = galleryUrls.length > 0
  const secondaryImages = galleryUrls.slice(0, 2)
  const overflowCount = galleryUrls.length > 2 ? galleryUrls.length - 2 : 0

  if (!heroUrl || heroError) {
    return (
      <div className="ut-peek-exp-collage-fallback">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`ut-peek-exp-collage ${hasGallery ? 'has-gallery' : 'single-image'}`}>
      <div className="ut-peek-exp-collage-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroUrl}
          alt={title}
          className="ut-peek-exp-collage-img"
          onError={() => setHeroError(true)}
        />
      </div>

      {hasGallery && (
        <div className="ut-peek-exp-collage-side">
          {secondaryImages.map((url, idx) => (
            <div key={idx} className="ut-peek-exp-collage-thumb-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="ut-peek-exp-collage-thumb" />
              {idx === 1 && overflowCount > 0 && (
                <div className="ut-peek-exp-collage-overflow">
                  +{overflowCount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Authoritative Booking Cockpit Slot:
 * Translates the visual reference design into a truthful, high-density 3-row administrative workspace.
 *
 * ROW 1: Experience & Journey (58%) | Customer Profile (42%)
 * ROW 2: Travelers (33%) | Financial Snapshot (33%) | Operational & Itinerary Details (33%)
 * ROW 3: Operational Actions (42%) | Timeline & System (58%)
 */
export const BookingCockpitSlot: React.FC<{
  doc: any
  onActionSuccess?: () => Promise<void> | void
}> = ({ doc, onActionSuccess }) => {
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null)

  if (!doc) return null

  // Customer Profile resolution
  const user = typeof doc.user === 'object' && doc.user !== null ? doc.user : null
  const customerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.name ||
    doc.userEmail ||
    (typeof doc.user === 'string' ? doc.user : 'Guest')

  const customerEmail = user?.email || doc.userEmail || null
  const customerPhone = user?.phone || (Array.isArray(doc.travelers) && doc.travelers[0]?.phone) || null
  const customerTier = user?.loyalty?.tier || null
  const customerInitials =
    customerName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || 'CU'

  // Experience / Trip resolution
  const exp = typeof doc.experience === 'object' && doc.experience !== null ? doc.experience : null
  const expTitle = exp?.title || (typeof doc.experience === 'string' ? doc.experience : 'Experience')
  const expHero = exp?.hero || exp?.heroImage
  const expHeroUrl =
    typeof expHero === 'object' && expHero?.url
      ? expHero.url
      : typeof expHero === 'string'
        ? expHero
        : null

  const galleryList = Array.isArray(exp?.gallery) ? exp.gallery : []
  const galleryUrls: string[] = galleryList
    .map((item: any) => {
      const img = item?.image || item
      return typeof img === 'object' && img?.url
        ? img.url
        : typeof img === 'string'
          ? img
          : null
    })
    .filter(Boolean)

  const cityName =
    typeof exp?.city === 'object' && exp.city?.name
      ? exp.city.name
      : typeof exp?.city === 'string'
        ? exp.city
        : null

  const durationStr = formatDuration(null, exp)

  const travelDates =
    doc.startDate && doc.endDate
      ? `${formatDate(doc.startDate)} – ${formatDate(doc.endDate)}`
      : formatDate(doc.startDate) || '—'

  // Travelers resolution
  const travelers: Traveler[] = Array.isArray(doc?.travelers) ? doc.travelers : []
  const adults = travelers.filter((t) => !t.type || t.type === 'adult').length
  const children = travelers.filter((t) => t.type === 'child').length
  const infants = travelers.filter((t) => t.type === 'infant').length

  const travelerSummary =
    adults > 0 && children === 0 && infants === 0
      ? `${adults} ${adults === 1 ? 'Adult' : 'Adults'}`
      : [
          adults > 0 ? `${adults} Ad` : null,
          children > 0 ? `${children} Ch` : null,
          infants > 0 ? `${infants} Inf` : null,
        ]
          .filter(Boolean)
          .join(', ') || `${travelers.length} Guests`

  // Financial snapshot resolution (Authoritative SSOT values)
  const basePrice = doc?.pricingSnapshot?.basePriceEGP ?? doc?.basePrice
  const totalAmount =
    doc?.pricingSnapshot?.totalAmountEGP ??
    doc?.['pricingSnapshot.totalAmountEGP'] ??
    doc?.totalPrice ??
    doc?.totalAmount
  const loyaltyDiscount = doc?.pricingSnapshot?.loyaltyDiscountEGP
  const couponDiscount = doc?.pricingSnapshot?.couponDiscountEGP
  const promoDiscount = doc?.pricingSnapshot?.promotionDiscountEGP
  const paid = doc?.amountPaid ?? doc?.['amountPaid'] ?? 0
  const outstanding =
    doc?.outstandingBalance ??
    doc?.['outstandingBalance'] ??
    (totalAmount != null ? Math.max(0, Number(totalAmount) - Number(paid || 0)) : 0)
  const currency = doc?.pricingSnapshot?.displayCurrency || 'EGP'
  const paymentStatus = (doc?.paymentStatus || 'unpaid').toLowerCase()
  const isPaid = paymentStatus === 'paid'

  // Operational status resolution
  const bookingStatus = (doc?.status || 'draft').toLowerCase()
  const isStatusPositive =
    bookingStatus === 'confirmed' || bookingStatus === 'completed' || bookingStatus === 'paid'
  const isStatusWarning =
    bookingStatus === 'pending_admin_review' || bookingStatus === 'pending_payment'
  const isStatusDanger =
    bookingStatus === 'cancelled' || bookingStatus === 'refunded' || bookingStatus === 'expired'

  const statusBadgeClass = isStatusPositive
    ? 'is-positive'
    : isStatusWarning
      ? 'is-warning'
      : isStatusDanger
        ? 'is-danger'
        : 'is-neutral'

  return (
    <div className="ut-peek-cockpit">
      {/* =========================================================================
          ROW 1: Experience & Journey (58%) | Customer Profile (42%)
          ========================================================================= */}
      <div className="ut-peek-cockpit-row ut-peek-cockpit-row-1">
        {/* Card 1: Experience & Journey */}
        <div className="ut-peek-cockpit-card ut-peek-card-exp">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-orange" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Experience & Journey</h3>
            </div>
          </div>

          <div className="ut-peek-card-body">
            <div className="ut-peek-exp-hero-split">
              <ExperienceVisualCollage
                heroUrl={expHeroUrl}
                galleryUrls={galleryUrls}
                title={expTitle}
              />

              <div className="ut-peek-exp-header-content">
                <h4 className="ut-peek-exp-title" title={expTitle}>
                  {expTitle}
                </h4>

                <div className="ut-peek-exp-meta-pills">
                  {cityName && (
                    <span className="ut-peek-meta-pill">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{cityName}</span>
                    </span>
                  )}
                  {durationStr && (
                    <span className="ut-peek-meta-pill">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{durationStr}</span>
                    </span>
                  )}
                  {doc.destinationTimezone && (
                    <span className="ut-peek-meta-pill">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span>{doc.destinationTimezone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-grid with 3 distinct soft-bordered info boxes */}
            <div className="ut-peek-exp-subgrid">
              <div className="ut-peek-subbox">
                <span className="ut-peek-subbox-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div className="ut-peek-subbox-content">
                  <span className="ut-peek-subbox-label">Travel Dates</span>
                  <span className="ut-peek-subbox-val">{travelDates}</span>
                </div>
              </div>

              <div className="ut-peek-subbox">
                <span className="ut-peek-subbox-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div className="ut-peek-subbox-content">
                  <span className="ut-peek-subbox-label">Destination</span>
                  <span className="ut-peek-subbox-val">{cityName || '—'}</span>
                </div>
              </div>

              <div className="ut-peek-subbox">
                <span className="ut-peek-subbox-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div className="ut-peek-subbox-content">
                  <span className="ut-peek-subbox-label">Pickup Point</span>
                  <span className="ut-peek-subbox-val" title={doc.pickupLocation?.address || undefined}>
                    {doc.pickupLocation?.address || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Customer Profile */}
        <div className="ut-peek-cockpit-card ut-peek-card-cust">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-blue" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Customer Profile</h3>
            </div>
            {customerTier && (
              <span className="ut-peek-badge-tier-gold">{customerTier}</span>
            )}
          </div>

          <div className="ut-peek-card-body">
            <div className="ut-peek-cust-main-row">
              <div className="ut-peek-cust-avatar" title={customerName}>
                {customerInitials}
              </div>
              <div className="ut-peek-cust-info">
                <h4 className="ut-peek-cust-name">{customerName}</h4>
                <div className="ut-peek-cust-contacts">
                  {customerEmail && (
                    <span className="ut-peek-cust-contact-item" title={customerEmail}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <span>{customerEmail}</span>
                    </span>
                  )}
                  {customerPhone && (
                    <span className="ut-peek-cust-contact-item" title={customerPhone}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{customerPhone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom 3 mini-stat cards */}
            <div className="ut-peek-cust-stat-grid">
              <div className="ut-peek-cust-stat-box">
                <span className="ut-peek-cust-stat-icon is-amber" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <div className="ut-peek-cust-stat-info">
                  <span className="ut-peek-cust-stat-label">Booking #</span>
                  <span className="ut-peek-cust-stat-value is-mono">{doc.bookingNumber}</span>
                </div>
              </div>

              <div className="ut-peek-cust-stat-box">
                <span className="ut-peek-cust-stat-icon is-green" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <div className="ut-peek-cust-stat-info">
                  <span className="ut-peek-cust-stat-label">Account Status</span>
                  <span className="ut-peek-cust-stat-value is-success">
                    {formatLabel(user?.status || 'Active')}
                  </span>
                </div>
              </div>

              <div className="ut-peek-cust-stat-box">
                <span className="ut-peek-cust-stat-icon is-gold" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 16 3 5 8.5 10 12 4 15.5 10 21 5 19 16 5 16" />
                  </svg>
                </span>
                <div className="ut-peek-cust-stat-info">
                  <span className="ut-peek-cust-stat-label">Customer Tier</span>
                  <span className="ut-peek-cust-stat-value">{customerTier || 'Explorer'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: Travelers (33%) | Financial Snapshot (33%) | Operational & Itinerary (33%)
          ========================================================================= */}
      <div className="ut-peek-cockpit-row ut-peek-cockpit-row-2">
        {/* Card 3: Travelers */}
        <div className="ut-peek-cockpit-card ut-peek-card-travelers">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-blue" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Travelers ({travelers.length})</h3>
            </div>
            <span className="ut-peek-card-pill">{travelerSummary}</span>
          </div>

          <div className="ut-peek-card-body">
            {travelers.length === 0 ? (
              <div className="ut-peek-empty-state">No guest records attached.</div>
            ) : (
              <div className="ut-peek-travelers-list">
                {travelers.map((t, idx) => {
                  const fullName = [t.firstName, t.lastName].filter(Boolean).join(' ') || `Traveler #${idx + 1}`
                  const initials =
                    [t.firstName, t.lastName]
                      .filter(Boolean)
                      .map((s) => s![0]?.toUpperCase())
                      .join('') || `${idx + 1}`
                  const typeKey = (t.type || 'adult').toLowerCase()
                  const typeClass = typeKey === 'child' ? 'is-child' : typeKey === 'infant' ? 'is-infant' : ''

                  return (
                    <div
                      key={t.id || idx}
                      className="ut-peek-traveler-row"
                      onClick={() => setSelectedTraveler(t)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedTraveler(t)
                        }
                      }}
                      title={`Click to inspect details for ${fullName}`}
                    >
                      <div className="ut-peek-traveler-left">
                        <div className="ut-peek-traveler-initials">{initials}</div>
                        <div className="ut-peek-traveler-meta">
                          <span className="ut-peek-traveler-name">{fullName}</span>
                          <span className={`ut-peek-traveler-type-badge ${typeClass}`}>
                            {t.type || 'Adult'}
                          </span>
                        </div>
                      </div>

                      <div className="ut-peek-traveler-right">
                        {t.phone ? (
                          <span className="ut-peek-traveler-phone">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{t.phone}</span>
                          </span>
                        ) : null}
                        <svg className="ut-peek-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {travelers.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTraveler(travelers[0])}
                className="ut-peek-view-all-travelers-btn print-hide"
              >
                <span>+ View all traveler details</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Financial Snapshot */}
        <div className="ut-peek-cockpit-card ut-peek-card-finance">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-green" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Financial Snapshot</h3>
            </div>
            <span className="ut-peek-card-pill">{currency}</span>
          </div>

          <div className="ut-peek-card-body">
            <div className="ut-peek-financial-list">
              <div className="ut-peek-fin-row is-total">
                <div className="ut-peek-fin-left">
                  <span className="ut-peek-fin-icon is-green">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </span>
                  <span className="ut-peek-fin-label">Total Amount</span>
                </div>
                <span className="ut-peek-fin-value is-bold">{formatPrice(totalAmount, currency)}</span>
              </div>

              <div className="ut-peek-fin-row">
                <div className="ut-peek-fin-left">
                  <span className="ut-peek-fin-icon is-amber">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </span>
                  <span className="ut-peek-fin-label">Base Price</span>
                </div>
                <span className="ut-peek-fin-value">{formatPrice(basePrice, currency)}</span>
              </div>

              {loyaltyDiscount != null && Number(loyaltyDiscount) > 0 && (
                <div className="ut-peek-fin-row">
                  <div className="ut-peek-fin-left">
                    <span className="ut-peek-fin-icon is-green">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                      </svg>
                    </span>
                    <span className="ut-peek-fin-label">Loyalty Discount</span>
                  </div>
                  <span className="ut-peek-fin-value is-discount">
                    -{Number(loyaltyDiscount).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {couponDiscount != null && Number(couponDiscount) > 0 && (
                <div className="ut-peek-fin-row">
                  <div className="ut-peek-fin-left">
                    <span className="ut-peek-fin-icon is-green">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                    <span className="ut-peek-fin-label">Coupon Discount</span>
                  </div>
                  <span className="ut-peek-fin-value is-discount">
                    -{Number(couponDiscount).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {promoDiscount != null && Number(promoDiscount) > 0 && (
                <div className="ut-peek-fin-row">
                  <div className="ut-peek-fin-left">
                    <span className="ut-peek-fin-icon is-green">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                    <span className="ut-peek-fin-label">Promotion Discount</span>
                  </div>
                  <span className="ut-peek-fin-value is-discount">
                    -{Number(promoDiscount).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              <div className="ut-peek-fin-row">
                <div className="ut-peek-fin-left">
                  <span className="ut-peek-fin-icon is-blue">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </span>
                  <span className="ut-peek-fin-label">Paid</span>
                </div>
                <span className="ut-peek-fin-value">{formatPrice(paid, currency)}</span>
              </div>

              <div className="ut-peek-fin-row">
                <div className="ut-peek-fin-left">
                  <span className="ut-peek-fin-icon is-red">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <span className="ut-peek-fin-label">Outstanding Balance</span>
                </div>
                <span className={`ut-peek-fin-value ${outstanding > 0 ? 'is-outstanding' : ''}`}>
                  {formatPrice(outstanding, currency)}
                </span>
              </div>
            </div>

            {/* Highlighted Payment Status Row */}
            <div className="ut-peek-payment-status-block">
              <div className="ut-peek-psb-left">
                <span className="ut-peek-psb-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </span>
                <span className="ut-peek-psb-label">Payment Status</span>
              </div>
              <span className={`ut-peek-psb-badge ${isPaid ? 'is-paid' : 'is-unpaid'}`}>
                {isPaid && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{formatLabel(paymentStatus)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Operational & Itinerary Details */}
        <div className="ut-peek-cockpit-card ut-peek-card-ops">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-blue" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Operational & Itinerary Details</h3>
            </div>
          </div>

          <div className="ut-peek-card-body">
            <div className="ut-peek-ops-list">
              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Booking Lifecycle</span>
                </div>
                <span className={`ut-peek-badge-status ${statusBadgeClass}`}>
                  {formatLabel(doc.status)}
                </span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Departure Date</span>
                </div>
                <span className="ut-peek-ops-val">{formatDate(doc.startDate) || '—'}</span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Return Date</span>
                </div>
                <span className="ut-peek-ops-val">{formatDate(doc.endDate) || '—'}</span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Timezone</span>
                </div>
                <span className="ut-peek-ops-val">{doc.destinationTimezone || '—'}</span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Booking Channel</span>
                </div>
                <span className="ut-peek-ops-val">{formatLabel(doc.source || 'Website')}</span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Payment Deadline</span>
                </div>
                <span className="ut-peek-ops-val">{formatDate(doc.paymentWindowExpiresAt) || '—'}</span>
              </div>

              <div className="ut-peek-ops-row">
                <div className="ut-peek-ops-left">
                  <span className="ut-peek-ops-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                  </span>
                  <span className="ut-peek-ops-label">Operational Completion</span>
                </div>
                <span className="ut-peek-ops-val">{formatDate(doc.completionAt) || '—'}</span>
              </div>

              {doc.pickupLocation?.address && (
                <div className="ut-peek-ops-row">
                  <div className="ut-peek-ops-left">
                    <span className="ut-peek-ops-icon" aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <span className="ut-peek-ops-label">Pickup / Meeting Point</span>
                  </div>
                  <span className="ut-peek-ops-val" title={doc.pickupLocation.address}>
                    {doc.pickupLocation.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: Operational Actions (42%) | Timeline & System (58%)
          ========================================================================= */}
      <div className="ut-peek-cockpit-row ut-peek-cockpit-row-3">
        {/* Card 6: Operational Actions */}
        <div className="ut-peek-cockpit-card ut-peek-card-actions print-hide">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-orange" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Operational Actions</h3>
            </div>
          </div>

          <div className="ut-peek-card-body">
            <BookingOperationalActions
              bookingId={Number(doc.id)}
              status={doc.status || 'draft'}
              pricing={{
                basePriceEGP: Number(basePrice) || 0,
                loyaltyDiscountEGP: Number(loyaltyDiscount) || 0,
                totalAmountEGP: Number(totalAmount) || 0,
                paidEGP: Number(paid) || 0,
                outstandingBalanceEGP: Number(outstanding) || 0,
                displayCurrency: currency,
                paymentStatus: doc.paymentStatus,
              }}
              showStatusBadge={false}
              showFinancialSummary={false}
              onActionSuccess={async () => {
                if (onActionSuccess) {
                  await onActionSuccess()
                }
              }}
            />
          </div>
        </div>

        {/* Card 7: Timeline & System */}
        <div className="ut-peek-cockpit-card ut-peek-card-timeline">
          <div className="ut-peek-card-header">
            <div className="ut-peek-card-title-group">
              <span className="ut-peek-card-icon is-blue" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <h3 className="ut-peek-card-title">Timeline & System</h3>
            </div>
          </div>

          <div className="ut-peek-card-body">
            <div className="ut-peek-timeline-grid">
              <div className="ut-peek-timeline-box">
                <span className="ut-peek-timeline-icon" aria-hidden="true">
                  #
                </span>
                <div className="ut-peek-timeline-info">
                  <span className="ut-peek-timeline-label">Document ID</span>
                  <span className="ut-peek-timeline-val is-mono">{doc.id}</span>
                </div>
              </div>

              <div className="ut-peek-timeline-box">
                <span className="ut-peek-timeline-icon" aria-hidden="true">
                  {'</>'}
                </span>
                <div className="ut-peek-timeline-info">
                  <span className="ut-peek-timeline-label">Reference Code</span>
                  <span className="ut-peek-timeline-val is-mono">{doc.bookingNumber}</span>
                </div>
              </div>

              <div className="ut-peek-timeline-box">
                <span className="ut-peek-timeline-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div className="ut-peek-timeline-info">
                  <span className="ut-peek-timeline-label">Created Date</span>
                  <span className="ut-peek-timeline-val">{formatDate(doc.createdAt) || '—'}</span>
                </div>
              </div>

              <div className="ut-peek-timeline-box">
                <span className="ut-peek-timeline-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div className="ut-peek-timeline-info">
                  <span className="ut-peek-timeline-label">Last Updated</span>
                  <span className="ut-peek-timeline-val">{formatDate(doc.updatedAt) || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focused Traveler Detail Modal */}
      {selectedTraveler && (
        <TravelerDetailModal
          traveler={selectedTraveler}
          onClose={() => setSelectedTraveler(null)}
        />
      )}
    </div>
  )
}

/**
 * Backwards-Compatible Legacy Slots:
 * Retained and self-registered so any external callers or fallback configurations continue to work.
 */
export const BookingOverviewSlot: React.FC<{ doc: any }> = ({ doc }) => {
  if (!doc) return null
  return <BookingCockpitSlot doc={doc} />
}

export const BookingTravelersSlot: React.FC<{ doc: any }> = ({ doc }) => {
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null)
  const travelers: Traveler[] = Array.isArray(doc?.travelers) ? doc.travelers : []
  const count = travelers.length

  if (count === 0) {
    return (
      <PeekSectionCard title="Travelers (0)">
        <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No guest records attached to this booking.
        </div>
      </PeekSectionCard>
    )
  }

  const adults = travelers.filter((t) => !t.type || t.type === 'adult').length
  const children = travelers.filter((t) => t.type === 'child').length
  const infants = travelers.filter((t) => t.type === 'infant').length

  const summaryParts = []
  if (adults > 0) summaryParts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`)
  if (children > 0) summaryParts.push(`${children} ${children === 1 ? 'Child' : 'Children'}`)
  if (infants > 0) summaryParts.push(`${infants} ${infants === 1 ? 'Infant' : 'Infants'}`)
  const summaryStr = summaryParts.join(', ')

  return (
    <>
      <PeekSectionCard title={`Travelers (${count})`}>
        {summaryStr && (
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#64748b' }}>
            {summaryStr}
          </div>
        )}

        <div className="ut-peek-travelers-list">
          {travelers.map((t, idx) => {
            const fullName = [t.firstName, t.lastName].filter(Boolean).join(' ') || `Traveler #${idx + 1}`
            const initials =
              [t.firstName, t.lastName]
                .filter(Boolean)
                .map((s) => s![0]?.toUpperCase())
                .join('') || `${idx + 1}`

            const typeKey = (t.type || 'adult').toLowerCase()
            const typeBadgeClass =
              typeKey === 'child' ? 'is-child' : typeKey === 'infant' ? 'is-infant' : ''

            return (
              <div
                key={t.id || idx}
                className="ut-peek-traveler-row"
                onClick={() => setSelectedTraveler(t)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedTraveler(t)
                  }
                }}
                title={`Click to inspect details for ${fullName}`}
              >
                <div className="ut-peek-traveler-left">
                  <div className="ut-peek-traveler-initials">{initials}</div>
                  <div className="ut-peek-traveler-meta">
                    <span className="ut-peek-traveler-name">{fullName}</span>
                    <span className={`ut-peek-traveler-type-badge ${typeBadgeClass}`}>
                      {t.type || 'Adult'}
                    </span>
                  </div>
                </div>

                <div className="ut-peek-traveler-right">
                  {t.phone ? (
                    <span className="ut-peek-traveler-phone">{t.phone}</span>
                  ) : null}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      </PeekSectionCard>

      <TravelerDetailModal
        traveler={selectedTraveler}
        onClose={() => setSelectedTraveler(null)}
      />
    </>
  )
}

export const BookingOperationalActionsSlot: React.FC<{
  doc: any
  onActionSuccess?: () => Promise<void> | void
}> = ({ doc, onActionSuccess }) => {
  const bookingId = doc?.id ? Number(doc.id) : undefined
  if (!bookingId) return null

  const basePrice = doc.pricingSnapshot?.basePriceEGP ?? doc.basePrice
  const totalAmount =
    doc.pricingSnapshot?.totalAmountEGP ??
    doc['pricingSnapshot.totalAmountEGP'] ??
    doc.totalPrice ??
    doc.totalAmount
  const loyaltyDiscount = doc.pricingSnapshot?.loyaltyDiscountEGP
  const paid = doc.amountPaid ?? doc['amountPaid'] ?? 0
  const outstanding =
    doc.outstandingBalance ??
    doc['outstandingBalance'] ??
    (totalAmount != null ? Math.max(0, Number(totalAmount) - Number(paid || 0)) : 0)

  return (
    <PeekSectionCard title="Operational Actions">
      <BookingOperationalActions
        bookingId={bookingId}
        status={doc.status || 'draft'}
        pricing={{
          basePriceEGP: Number(basePrice) || 0,
          loyaltyDiscountEGP: Number(loyaltyDiscount) || 0,
          totalAmountEGP: Number(totalAmount) || 0,
          paidEGP: Number(paid) || 0,
          outstandingBalanceEGP: Number(outstanding) || 0,
          displayCurrency: doc.pricingSnapshot?.displayCurrency || 'EGP',
          paymentStatus: doc.paymentStatus,
        }}
        showStatusBadge={false}
        showFinancialSummary={false}
        onActionSuccess={async () => {
          if (onActionSuccess) {
            await onActionSuccess()
          }
        }}
      />
    </PeekSectionCard>
  )
}

export const DepartureSlotsSlot: React.FC<{
  doc: any
  onManageSlots?: (docId: string | number) => void
}> = ({ doc, onManageSlots }) => {
  if (!onManageSlots || doc?.id == null) return null

  const isEligible =
    doc?.type === 'package' && (!doc?.packageMode || doc?.packageMode === 'fixed_date')

  if (!isEligible) return null

  return (
    <PeekSectionCard title="Departure Slots">
      <FieldRow label="Control Surface" value="Authoritative SSOT" />
      <FieldRow label="Operations" value="Capacity, Seats & Bookings" />
      <div className="ut-peek-slots-action">
        <button
          type="button"
          onClick={() => onManageSlots(doc.id)}
          className="ut-peek-manage-slots-btn"
          title="Open Departure Slots Control Surface"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Manage Departure Slots</span>
        </button>
      </div>
    </PeekSectionCard>
  )
}

// Self-register operational slots
registerPeekSlot('bookingCockpit', BookingCockpitSlot)
registerPeekSlot('bookingOverview', BookingOverviewSlot)
registerPeekSlot('bookingTravelersList', BookingTravelersSlot)
registerPeekSlot('bookingOperationalActions', BookingOperationalActionsSlot)
registerPeekSlot('departureSlots', DepartureSlotsSlot)

