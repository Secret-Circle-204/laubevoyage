'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Badge, CurrencyDisplay, Button } from '@/components/ui'
import type { CustomerBookingCardDTO } from '@/application/dashboard/dto'
import { CustomerPaymentTruthPresenter } from '@/application/payment/customer-payment-truth'

function PinIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function UsersIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

export interface TravelLedgerCardProps {
  booking: CustomerBookingCardDTO
}

export function TravelLedgerCard({ booking }: TravelLedgerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const truth = CustomerPaymentTruthPresenter.resolve({
    bookingStatus: booking.status,
    paymentStatus: booking.paymentStatus,
    bookingNumber: booking.reference,
  })

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, select, textarea, [data-prevent-toggle="true"]')) {
      return
    }
    setIsExpanded((prev) => !prev)
  }

  return (
    <div
      onClick={handleCardClick}
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm transition-all duration-300 hover:border-secondary/40 cursor-pointer"
    >
      {/* Top Waypoint & Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-secondary">#{booking.reference}</span>
          {booking.destinationCity && (
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <span>•</span>
              <PinIcon className="w-3 h-3 text-secondary" />
              <span>{booking.destinationCity}</span>
            </span>
          )}
          {booking.productTypeLabel && (
            <span className="text-xs uppercase text-muted-foreground px-2 py-0.5 rounded-md bg-card-elevated border border-border/60 font-medium">
              {booking.productTypeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={truth.badgeVariant}
            size="sm"
            className="text-xs uppercase font-semibold tracking-wider"
          >
            {truth.badgeFallback}
          </Badge>

          {/* Accessible Details Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`ledger-details-${booking.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border/80 bg-card-elevated text-foreground hover:border-secondary/40 hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Resting Scan Layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
        {/* Left: Thumbnail & Experience Title */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-cover bg-center flex-shrink-0 border border-border/60 shadow-sm bg-card-elevated"
            style={{ backgroundImage: `url(${booking.experienceImage})` }}
          />
          <div className="min-w-0 space-y-1">
            <h3 className="font-serif font-light text-base sm:text-lg text-foreground tracking-tight truncate">
              {booking.experienceTitle}
            </h3>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-secondary" />
                <span>{booking.departureDate}</span>
              </span>
              {booking.durationText && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5 text-secondary" />
                  <span>{booking.durationText}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5 text-secondary" />
                <span>
                  {booking.passengersCount} {booking.passengersCount === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Authoritative Financial Settlement Spec & Quick Link */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60 flex-shrink-0">
          <CurrencyDisplay price={booking.totalCost} size="md" />
          {booking.isCancelled ? (
            <div className="text-right mt-0.5">
              <span className="text-xs text-muted-foreground font-medium">
                (Cancelled / Voided)
              </span>
            </div>
          ) : booking.paymentStatus === 'partially_paid' && booking.outstandingBalance ? (
            <div className="text-right mt-0.5 space-y-0.5">
              {booking.paidAmount && (
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <span>Paid:</span>
                  <CurrencyDisplay price={booking.paidAmount} size="sm" />
                </div>
              )}
              <div className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1">
                <span>Remaining:</span>
                <CurrencyDisplay price={booking.outstandingBalance} size="sm" />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Progressive Spatial Disclosure Panel (0fr -> 1fr, zero network requests) */}
      <div
        id={`ledger-details-${booking.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-elevated/70 p-4 rounded-xl border border-border/60 text-xs">
            {/* Contextual Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-grow">
              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">
                  Departure Time
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {booking.departureTime || 'Standard Schedule'}
                  {booking.destinationTimezone ? ` (${booking.destinationTimezone})` : ''}
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">
                  Return / End
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {booking.returnTime || booking.endDate || 'Same Day'}
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">
                  Manifest Roster
                </span>
                <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <UsersIcon className="w-3 h-3 text-secondary inline" />
                  <span>
                    {booking.passengersCount} {booking.passengersCount === 1 ? 'Passenger' : 'Passengers'}
                  </span>
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">
                  Settlement Status
                </span>
                <span className="font-semibold text-foreground mt-0.5 capitalize block">
                  {booking.paymentStatus?.replace(/_/g, ' ') || 'Confirmed'}
                </span>
              </div>
            </div>

            {/* Direct Contextual Action Button */}
            <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0 pt-2 md:pt-0">
              {truth.semanticState === 'PAYMENT_REQUIRED' || truth.semanticState === 'PAYMENT_FAILED' ? (
                <Link href={`/checkout/${booking.reference || booking.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>{truth.primaryAction.labelFallback}</span>
                  </Button>
                </Link>
              ) : truth.semanticState === 'BOOKING_EXPIRED' ? (
                <Link href="/experiences">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>Book Again →</span>
                  </Button>
                </Link>
              ) : (
                <Link href={`/dashboard/bookings/${booking.reference || booking.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>Access Travel Dossier</span>
                    <span>→</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
