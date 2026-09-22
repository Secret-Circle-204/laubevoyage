'use client'

import React from 'react'

interface PeekSectionCardProps {
  title: string
  children: React.ReactNode
}

export const PeekSectionCard: React.FC<PeekSectionCardProps> = ({ title, children }) => (
  <div className="ut-peek-card">
    <h3 className="ut-peek-card-title">{title}</h3>
    <div className="ut-peek-card-body">{children}</div>
  </div>
)

interface FieldRowProps {
  label: string
  value?: React.ReactNode
  isMono?: boolean
}

export const FieldRow: React.FC<FieldRowProps> = ({ label, value, isMono = false }) => {
  if (value === undefined || value === null || value === '') {
    return (
      <div className="ut-peek-row">
        <span className="ut-peek-row-label">{label}</span>
        <span className="ut-peek-row-empty">—</span>
      </div>
    )
  }

  return (
    <div className="ut-peek-row">
      <span className="ut-peek-row-label">{label}</span>
      <span
        className={`ut-peek-row-value ${isMono ? 'is-mono' : ''}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function formatDate(val: any): string | null {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function formatPrice(amount: any, currency: any): string | null {
  if (amount === undefined || amount === null) return null
  const num = Number(amount)
  if (isNaN(num)) return null
  return `${num.toLocaleString()} ${currency || 'EGP'}`
}

function formatLabel(val: any): string | null {
  if (!val) return null
  const str = String(val).replace(/_/g, ' ').trim()
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Experience Peek Body - High Density Editorial Presentation
 */
export const ExperiencePeekContent: React.FC<{
  doc: any
  onManageSlots?: (docId: string | number) => void
}> = ({ doc, onManageSlots }) => {
  const cityName = typeof doc.city === 'object' ? doc.city?.name : doc.cityName || null
  const destinationsCount = Array.isArray(doc.destinations) ? doc.destinations.length : null
  const heroUrl =
    typeof doc.hero === 'object' && doc.hero?.url
      ? doc.hero.url
      : typeof doc.thumbnail === 'object' && doc.thumbnail?.url
        ? doc.thumbnail.url
        : null

  const days = doc.duration?.days
  const nights = doc.duration?.nights
  const durationText = days != null ? `${days} Days${nights != null ? ` / ${nights} Nights` : ''}` : null

  return (
    <div>
      {heroUrl && (
        <div className="ut-peek-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl}
            alt={doc.title || 'Experience'}
          />
          <div className="ut-peek-hero-gradient" />
          {cityName && (
            <div className="ut-peek-hero-caption">
              {cityName}
            </div>
          )}
        </div>
      )}

      <PeekSectionCard title="Geography & Itinerary">
        <FieldRow label="Origin City" value={cityName} />
        {destinationsCount !== null && (
          <FieldRow label="Transit Destinations" value={`${destinationsCount} Stops`} />
        )}
        <FieldRow label="Duration" value={durationText} />
        <FieldRow label="Type" value={formatLabel(doc.type)} />
        <FieldRow label="Package Mode" value={formatLabel(doc.packageMode)} />
      </PeekSectionCard>

      <PeekSectionCard title="Commercial & Availability">
        <FieldRow
          label="Base Price"
          value={formatPrice(doc.price, doc.currency)}
        />
        <FieldRow
          label="Availability Status"
          value={formatLabel(doc.availability)}
        />
      </PeekSectionCard>

      {onManageSlots && doc?.id != null && (
        <PeekSectionCard title="Departure Slots">
          <FieldRow label="Control Surface" value="Authoritative SSOT" />
          <FieldRow
            label="Operations"
            value="Capacity, Seats & Bookings"
          />
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
      )}

      <PeekSectionCard title="System & Identifiers">
        <FieldRow label="Document ID" value={String(doc.id)} isMono={true} />
        <FieldRow label="Slug" value={doc.slug} isMono={true} />
        <FieldRow label="Created Date" value={formatDate(doc.createdAt)} />
        <FieldRow label="Last Updated" value={formatDate(doc.updatedAt)} />
      </PeekSectionCard>
    </div>
  )
}

/**
 * Booking Command Center Peek Body - High Density Operational Presentation
 */
export const BookingPeekContent: React.FC<{ doc: any }> = ({ doc }) => {
  const customerName =
    typeof doc.user === 'object' && doc.user !== null
      ? doc.user?.email || [doc.user?.firstName, doc.user?.lastName].filter(Boolean).join(' ') || doc.user?.name || null
      : typeof doc.user === 'string'
        ? doc.user
        : doc.userEmail || null

  const experienceTitle =
    typeof doc.experience === 'object' && doc.experience !== null
      ? doc.experience?.title || doc.experience?.name || null
      : typeof doc.experience === 'string'
        ? doc.experience
        : doc.experienceTitle || null

  const travelersCount = Array.isArray(doc.travelers) ? doc.travelers.length : doc.travelersCount || null

  // Canonical commercial truth from authoritative Booking document (matching BookingStatusField)
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
    (totalAmount != null ? Math.max(0, Number(totalAmount) - Number(paid || 0)) : null)

  return (
    <div>
      <PeekSectionCard title="Customer Profile">
        <FieldRow label="Customer" value={customerName} />
        <FieldRow label="Booking #" value={doc.bookingNumber} isMono={true} />
        <FieldRow
          label="Status"
          value={formatLabel(doc.status)}
        />
      </PeekSectionCard>

      <PeekSectionCard title="Journey Details">
        <FieldRow label="Experience" value={experienceTitle} />
        <FieldRow label="Departure Date" value={formatDate(doc.startDate)} />
        <FieldRow label="Return Date" value={formatDate(doc.endDate)} />
        <FieldRow label="Travelers" value={travelersCount != null ? `${travelersCount} Guests` : null} />
        <FieldRow label="Timezone" value={doc.destinationTimezone || null} />
      </PeekSectionCard>

      <PeekSectionCard title="Financial Snapshot">
        <FieldRow label="Total Amount" value={formatPrice(totalAmount, 'EGP')} />
        <FieldRow label="Base Price" value={formatPrice(basePrice, 'EGP')} />
        {loyaltyDiscount != null && Number(loyaltyDiscount) > 0 && (
          <FieldRow label="Loyalty Discount" value={`-${Number(loyaltyDiscount).toLocaleString()} EGP`} />
        )}
        <FieldRow label="Paid" value={formatPrice(paid, 'EGP')} />
        <FieldRow label="Outstanding" value={formatPrice(outstanding, 'EGP')} />
      </PeekSectionCard>

      <PeekSectionCard title="Timeline & System">
        <FieldRow label="Document ID" value={String(doc.id)} isMono={true} />
        <FieldRow label="Created Date" value={formatDate(doc.createdAt)} />
        <FieldRow label="Completion Date" value={formatDate(doc.completionAt)} />
      </PeekSectionCard>
    </div>
  )
}
