'use client'

import React from 'react'
import type { PeekSectionDefinition } from '../types'
import { getPeekSlot } from '../registry'
import { Skeleton } from '@/components/ui/Skeleton'

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

export const PeekSlotRenderer: React.FC<{
  slotId: string
  doc: any
  onActionSuccess?: () => Promise<void> | void
  onManageSlots?: (docId: string | number) => void
}> = ({ slotId, doc, onActionSuccess, onManageSlots }) => {
  const Slot = getPeekSlot(slotId)
  if (!Slot) return null
  return React.createElement(Slot, { doc, onActionSuccess, onManageSlots })
}

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

export function formatDate(val: any): string | null {
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

export function formatPrice(amount: any, currency: any): string | null {
  if (amount === undefined || amount === null) return null
  const num = Number(amount)
  if (isNaN(num)) return null
  return `${num.toLocaleString()} ${currency || 'EGP'}`
}

export function formatLabel(val: any): string | null {
  if (!val) return null
  const str = String(val).replace(/_/g, ' ').trim()
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatRelation(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') {
    const fullName = [val.firstName, val.lastName].filter(Boolean).join(' ')
    return fullName || val.name || val.title || val.email || (val.id ? `#${val.id}` : null)
  }
  return null
}

export function formatArrayCount(val: any, unit?: string): string | null {
  if (Array.isArray(val)) {
    return `${val.length} ${unit || 'Items'}`
  }
  if (typeof val === 'number') {
    return `${val} ${unit || 'Items'}`
  }
  return null
}

export function formatDuration(val: any, doc: any): string | null {
  // 1. Check for Daily Tour duration (durationMinutes stored deterministically in minutes)
  const durationMinutes =
    doc?.duration?.durationMinutes != null
      ? Number(doc.duration.durationMinutes)
      : doc?.durationMinutes != null
        ? Number(doc.durationMinutes)
        : null

  if (durationMinutes != null && !isNaN(durationMinutes) && durationMinutes > 0) {
    const hours = durationMinutes / 60
    const formattedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '')
    return `${formattedHours} ${hours === 1 ? 'Hour' : 'Hours'}`
  }

  // 2. Check for Package duration (days & optional nights)
  const days = doc?.duration?.days != null ? Number(doc.duration.days) : null
  const nights = doc?.duration?.nights != null ? Number(doc.duration.nights) : null

  if (days != null && !isNaN(days) && days > 0) {
    return `${days} ${days === 1 ? 'Day' : 'Days'}${nights != null && !isNaN(nights) && nights > 0 ? ` / ${nights} ${nights === 1 ? 'Night' : 'Nights'}` : ''}`
  }

  // 3. Fallbacks for scalar or string values
  if (typeof val === 'number' && val > 0) return `${val} Days`
  if (typeof val === 'string' && val.trim() !== '') return val
  return null
}

/**
 * Editorial Peek Drawer Skeleton:
 * Strictly rendered only while authoritative document request is genuinely pending.
 */
export const PeekDrawerSkeleton: React.FC<{ hero?: boolean }> = ({ hero }) => {
  return (
    <div
      className="ut-peek-skeleton-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      aria-busy="true"
      aria-label="Loading document details"
    >
      {hero && (
        <Skeleton className="ut-peek-hero" />
      )}
      <div className="ut-peek-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton className="h-4 w-32" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <div className="ut-peek-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton className="h-4 w-32" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
    </div>
  )
}

/**
 * Experience Peek Body - High Density Editorial Presentation (Backwards-Compatible Wrapper)
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
        <PeekSlotRenderer slotId="departureSlots" doc={doc} onManageSlots={onManageSlots} />
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
 * Booking Command Center Peek Body - High Density Operational Presentation (Backwards-Compatible Wrapper)
 */
export const BookingPeekContent: React.FC<{
  doc: any
  onActionSuccess?: () => Promise<void> | void
}> = ({ doc, onActionSuccess }) => {
  const customerName =
    formatRelation(doc.user) ||
    (typeof doc.user === 'string' ? doc.user : doc.userEmail || null)

  const experienceTitle =
    formatRelation(doc.experience) ||
    (typeof doc.experience === 'string' ? doc.experience : doc.experienceTitle || null)

  const travelersCount = Array.isArray(doc.travelers) ? doc.travelers.length : doc.travelersCount || null

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

      {doc.id && (
        <PeekSlotRenderer slotId="bookingOperationalActions" doc={doc} onActionSuccess={onActionSuccess} />
      )}

      <PeekSectionCard title="Timeline & System">
        <FieldRow label="Document ID" value={String(doc.id)} isMono={true} />
        <FieldRow label="Created Date" value={formatDate(doc.createdAt)} />
        <FieldRow label="Completion Date" value={formatDate(doc.completionAt)} />
      </PeekSectionCard>
    </div>
  )
}

/**
 * Configured Peek Body - Generic Configuration-Driven Operational Presentation
 */
export const ConfiguredPeekContent: React.FC<{
  doc: any
  sections: PeekSectionDefinition[]
  onActionSuccess?: () => Promise<void> | void
  onManageSlots?: (docId: string | number) => void
}> = ({ doc, sections, onActionSuccess, onManageSlots }) => {
  return (
    <div>
      {sections.map((section, idx) => {
        // Section-level conditional rendering
        if (section.condition && !section.condition(doc)) {
          return null
        }

        if (section.customSlot) {
          return (
            <PeekSlotRenderer
              key={section.id || idx}
              slotId={section.customSlot}
              doc={doc}
              onActionSuccess={onActionSuccess}
              onManageSlots={onManageSlots}
            />
          )
        }

        // Field-level conditional rendering
        const visibleFields = section.fields.filter(
          (fDef) => !fDef.condition || fDef.condition(doc),
        )
        if (visibleFields.length === 0) {
          return null
        }

        return (
          <PeekSectionCard key={section.id || idx} title={section.title}>
            {visibleFields.map((fDef, fIdx) => {
              let val: any
              if (fDef.field.includes('.')) {
                val = fDef.field.split('.').reduce((acc: any, part: string) => acc?.[part], doc)
              } else {
                val = doc[fDef.field]
              }

              let formattedVal: React.ReactNode = val
              if (fDef.formatter === 'date') {
                formattedVal = formatDate(val)
              } else if (fDef.formatter === 'price') {
                formattedVal = formatPrice(val, doc.currency || 'EGP')
              } else if (fDef.formatter === 'status') {
                formattedVal = formatLabel(val)
              } else if (fDef.formatter === 'relation') {
                formattedVal = formatRelation(val)
              } else if (fDef.formatter === 'arrayCount') {
                formattedVal = formatArrayCount(val, fDef.unit)
              } else if (fDef.formatter === 'duration') {
                formattedVal = formatDuration(val, doc)
              } else if (typeof val === 'object' && val !== null) {
                formattedVal = formatRelation(val)
              }

              return (
                <FieldRow
                  key={fIdx}
                  label={fDef.label}
                  value={formattedVal}
                  isMono={fDef.isMono}
                />
              )
            })}
          </PeekSectionCard>
        )
      })}
    </div>
  )
}

/**
 * Generic Peek Fallback - Schema-agnostic safe inspection card
 */
export const GenericPeekContent: React.FC<{ doc: any }> = ({ doc }) => {
  const keys = Object.keys(doc).filter(
    (k) => !k.startsWith('_') && k !== 'id' && typeof doc[k] !== 'function',
  )

  return (
    <PeekSectionCard title="Document Overview">
      <FieldRow label="ID" value={String(doc.id)} isMono={true} />
      {keys.slice(0, 15).map((key) => {
        const val = doc[key]
        let displayVal: any = val
        if (typeof val === 'object' && val !== null) {
          displayVal = formatRelation(val)
        }
        if (displayVal == null) return null
        return (
          <FieldRow
            key={key}
            label={formatLabel(key) || key}
            value={typeof displayVal === 'string' || typeof displayVal === 'number' ? String(displayVal) : null}
          />
        )
      })}
    </PeekSectionCard>
  )
}
