'use client'

import React from 'react'
import Link from 'next/link'
import { Badge, CurrencyDisplay, EmptyState, Button } from '@/components/ui'
import type { CustomerPortalOverviewDTO, CustomerBookingCardDTO, CustomerPortalOverviewLabelsDTO } from '@/application/dashboard/dto'

function PinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function UsersIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function GemIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

function PrimaryJourneyCard({
  booking,
  uiLabels,
}: {
  booking: CustomerBookingCardDTO
  uiLabels: CustomerPortalOverviewLabelsDTO
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed'
  const isReview = booking.status === 'pending_admin_review'

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
      className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm transition-all duration-300 hover:border-secondary/40 cursor-pointer"
    >
      {/* Top Ledger Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(0,174,239,0.7)]" />
          <span className="text-xs font-bold uppercase text-muted-foreground">
            {uiLabels.primaryVoyageDossier}
          </span>
          <span className="text-xs font-bold text-secondary">
            #{booking.reference}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <Badge variant="secondary" size="sm" className="text-xs uppercase bg-secondary/10 text-secondary border-secondary/25 font-semibold">
              {uiLabels.statusConfirmed}
            </Badge>
          ) : isReview ? (
            <Badge variant="outline" size="sm" className="text-xs uppercase border-amber-500/30 text-amber-500 bg-amber-500/5 font-semibold">
              {uiLabels.statusPendingReview}
            </Badge>
          ) : booking.status === 'pending_payment' ? (
            <Badge variant="warning" size="sm" className="text-xs uppercase bg-amber-500/10 text-amber-500 border border-amber-500/25 font-semibold">
              PAYMENT REQUIRED
            </Badge>
          ) : booking.status === 'payment_received_after_expiry' ? (
            <Badge variant="warning" size="sm" className="text-xs uppercase bg-amber-500/10 text-amber-500 border border-amber-500/25 font-semibold">
              CONCIERGE REVIEW
            </Badge>
          ) : booking.status === 'expired' ? (
            <Badge variant="outline" size="sm" className="text-xs uppercase border-border text-muted-foreground font-semibold">
              EXPIRED
            </Badge>
          ) : booking.status === 'cancelled' ? (
            <Badge variant="error" size="sm" className="text-xs uppercase border-rose-500/30 text-rose-500 bg-rose-500/10 font-semibold">
              CANCELLED
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" className="text-xs uppercase border-border text-muted-foreground font-semibold">
              {booking.status.toUpperCase()}
            </Badge>
          )}

          {/* Accessible Details Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`journey-details-${booking.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border/80 bg-card-elevated text-foreground hover:border-secondary/40 hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer transition-colors"
          >
            <span>{isExpanded ? uiLabels.hideDetails : uiLabels.details}</span>
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

      {/* Main Experience Visual & Primary Resting Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-center">
        {/* Experience Image Thumbnail */}
        <div className="lg:col-span-4 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden border border-border/80 shadow-sm bg-card-elevated">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${booking.experienceImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {booking.productTypeLabel && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-black/60 backdrop-blur-md text-white border border-white/20">
                {booking.productTypeLabel}
              </span>
            </div>
          )}
        </div>

        {/* Experience Resting Details & Action */}
        <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground">
              {booking.experienceTitle}
            </h2>
            {booking.destinationCity && (
              <p className="text-xs font-semibold text-secondary uppercase flex items-center gap-1.5">
                <PinIcon className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                <span>{booking.destinationCity}</span>
              </p>
            )}
          </div>

          {/* Resting Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-card-elevated/70 border border-border/60 text-xs">
            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.departure}</span>
              <span className="font-semibold text-foreground mt-0.5 block">{booking.departureDate}</span>
            </div>

            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.settlement}</span>
              <div className="mt-0.5">
                <CurrencyDisplay price={booking.totalCost} size="sm" />
              </div>
            </div>

            {booking.paymentStatus === 'partially_paid' && booking.outstandingBalance && (
              <div>
                <span className="text-[11px] uppercase text-amber-500 block font-medium">{uiLabels.balanceDue}</span>
                <div className="mt-0.5 text-amber-500 font-bold">
                  <CurrencyDisplay price={booking.outstandingBalance} size="sm" />
                </div>
              </div>
            )}

            {booking.status === 'pending_payment' ? (
              <Link href={`/checkout/${booking.reference || booking.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>Complete Payment</span>
                  <span>→</span>
                </Button>
              </Link>
            ) : booking.status === 'expired' ? (
              <Link href="/experiences">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>Book Again</span>
                  <span>→</span>
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/bookings/${booking.reference || booking.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>{uiLabels.accessTravelDossier}</span>
                  <span>→</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Section (Content-safe CSS grid) */}
      <div
        id={`journey-details-${booking.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-5 pt-5 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-card-elevated/70 p-3.5 rounded-2xl border border-border/60">
            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">
                {booking.durationText
                  ? (uiLabels.duration || 'Duration')
                  : booking.departureTime
                    ? (uiLabels.departureTime || 'Departure Time')
                    : booking.endDate
                      ? (uiLabels.travelDates || 'Travel Dates')
                      : (uiLabels.departure || 'Departure')}
              </span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {booking.durationText ||
                  (booking.departureTime
                    ? `${booking.departureTime}${booking.destinationTimezone ? ` (${booking.destinationTimezone})` : ''}`
                    : booking.endDate
                      ? `${booking.departureDate} – ${booking.endDate}`
                      : (booking.departureDate || '—'))}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.manifest}</span>
              <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                <UsersIcon className="w-3 h-3 text-secondary inline" />
                <span>{booking.passengersCount} {booking.passengersCount === 1 ? uiLabels.travelerSingle : uiLabels.travelerMultiple}</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.tourType || uiLabels.type}</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {booking.productTypeLabel || '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.paymentStatus}</span>
              <span className="font-semibold text-foreground mt-0.5 capitalize block">
                {booking.paymentStatus === 'paid'
                  ? uiLabels.fullySettled
                  : booking.paymentStatus === 'partially_paid'
                    ? uiLabels.partiallyPaid
                    : booking.paymentStatus === 'unpaid'
                      ? uiLabels.pending
                      : (booking.paymentStatus?.replace(/_/g, ' ') || uiLabels.statusConfirmed)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonalTravelWallet({ data }: { data: CustomerPortalOverviewDTO }) {
  const [isExpanded, setIsExpanded] = React.useState(false)

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
      className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm transition-all duration-300 hover:border-secondary/40 cursor-pointer"
    >
      {/* Top Wallet Eyebrow & Toggle Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <GemIcon className="w-4 h-4 text-secondary" />
          <span className="text-xs font-bold uppercase text-muted-foreground">
            {data.uiLabels.travelWalletTitle}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-secondary/10 text-secondary border border-secondary/25">
            {data.formattedCurrentTier || `${data.translatedCurrentTier} ${data.uiLabels.tierSuffix}`}
          </span>

          {/* Accessible Details Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls="travel-wallet-details"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border/80 bg-card-elevated text-foreground hover:border-secondary/40 hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer transition-colors"
          >
            <span>{isExpanded ? data.uiLabels.hideDetails : data.uiLabels.viewDetails}</span>
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

      {/* Resting State: Calm Master Balance & Compact Progress Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
        {/* Left: Master Points Balance & Voyage Credit Value */}
        <div className="md:col-span-7 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-hornbill font-light text-foreground">
            {data.formattedPoints}
          </span>
          <span className="text-sm font-bold text-secondary uppercase">
            {data.uiLabels.points}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-secondary/10 border border-secondary/20 text-xs font-semibold text-secondary">
            ≈ {data.pointsMonetaryValue.formatted} {data.uiLabels.pointsValue}
          </span>
        </div>

        {/* Right: Compact Tier Progress Track */}
        <div className="md:col-span-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground uppercase font-medium">{data.formattedCurrentTier || `${data.translatedCurrentTier} ${data.uiLabels.tierSuffix}`}</span>
            <span className="text-secondary font-bold">{data.nextTierProgressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-card-elevated border border-border/80 overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,174,239,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, data.nextTierProgressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Section (Content-safe CSS grid) */}
      <div
        id="travel-wallet-details"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6 pt-6 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Points Guide Context & Hub link */}
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {data.pointsValueGuide.description}
              </p>
              <div>
                <Link href="/dashboard/loyalty">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{data.uiLabels.loyaltyHubBtn}</span>
                    <span>→</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Qualifying Spend & Active Itineraries Matrix */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-card-elevated/70 border border-border/60 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs font-medium">{data.uiLabels.totalSpend}:</span>
                <span className="font-bold text-foreground">{data.formattedTotalSpentEGP}</span>
              </div>

              {data.formattedRemainingQualifyingSpend && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">{data.uiLabels.spendToNextTier}:</span>
                  <span className="text-secondary font-semibold">{data.formattedRemainingQualifyingSpend}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground text-xs font-medium">{data.uiLabels.activeItineraries}:</span>
                <Link href="/dashboard/bookings" className="font-bold text-secondary hover:underline">
                  {data.activeBookingsCount} {data.activeBookingsCount === 1 ? data.uiLabels.voyageSingle : data.uiLabels.voyageMultiple} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentReservationRow({
  booking,
  uiLabels,
}: {
  booking: CustomerBookingCardDTO
  uiLabels: CustomerPortalOverviewLabelsDTO
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed'
  const isReview = booking.status === 'pending_admin_review'

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
      className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm transition-all duration-300 hover:border-secondary/40 cursor-pointer"
    >
      {/* Resting Primary Row: Scan Path (Reference • Title/Destination • Date • Status • Amount • Details Toggle) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-12 h-12 rounded-xl bg-cover bg-center flex-shrink-0 border border-border/60 shadow-sm"
            style={{ backgroundImage: `url(${booking.experienceImage})` }}
          />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-secondary">
                #{booking.reference}
              </span>
              {isConfirmed ? (
                <Badge variant="secondary" size="sm" className="text-xs uppercase bg-secondary/10 text-secondary border-secondary/25 font-semibold">
                  {uiLabels.statusConfirmed}
                </Badge>
              ) : isReview ? (
                <Badge variant="outline" size="sm" className="text-xs uppercase border-amber-500/30 text-amber-500 bg-amber-500/5 font-semibold">
                  {uiLabels.statusPendingReview}
                </Badge>
              ) : booking.status === 'pending_payment' ? (
                <Badge variant="warning" size="sm" className="text-xs uppercase bg-amber-500/10 text-amber-500 border border-amber-500/25 font-semibold">
                  PAYMENT REQUIRED
                </Badge>
              ) : booking.status === 'payment_received_after_expiry' ? (
                <Badge variant="warning" size="sm" className="text-xs uppercase bg-amber-500/10 text-amber-500 border border-amber-500/25 font-semibold">
                  CONCIERGE REVIEW
                </Badge>
              ) : booking.status === 'expired' ? (
                <Badge variant="outline" size="sm" className="text-xs uppercase border-border text-muted-foreground font-semibold">
                  EXPIRED
                </Badge>
              ) : booking.status === 'cancelled' ? (
                <Badge variant="error" size="sm" className="text-xs uppercase border-rose-500/30 text-rose-500 bg-rose-500/10 font-semibold">
                  CANCELLED
                </Badge>
              ) : (
                <Badge variant="outline" size="sm" className="text-xs uppercase border-border text-muted-foreground font-semibold">
                  {booking.status.toUpperCase()}
                </Badge>
              )}
            </div>

            <h3 className="font-serif font-light text-base text-foreground truncate">
              {booking.experienceTitle}
            </h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <CalendarIcon className="w-3 h-3 text-secondary inline" />
              <span>{booking.departureDate}</span>
              {booking.destinationCity && (
                <>
                  <span className="text-border">•</span>
                  <PinIcon className="w-3 h-3 text-secondary inline" />
                  <span>{booking.destinationCity}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Right side: Amount + Details Toggle */}
        <div className="flex items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 flex-shrink-0">
          <CurrencyDisplay price={booking.totalCost} size="sm" />

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`recent-booking-details-${booking.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border/80 bg-card-elevated text-foreground hover:border-secondary/40 hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer transition-colors"
          >
            <span>{isExpanded ? uiLabels.hideDetails : uiLabels.details}</span>
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

      {/* Progressive Spatial Disclosure: Unfolds additional existing metadata without layout shifts */}
      <div
        id={`recent-booking-details-${booking.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-border/60' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card-elevated/70 p-3.5 rounded-xl border border-border/60 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow">
              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.manifest}</span>
                <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <UsersIcon className="w-3 h-3 text-secondary inline" />
                  <span>{booking.passengersCount} {booking.passengersCount === 1 ? uiLabels.travelerSingle : uiLabels.travelerMultiple}</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.tourType}</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {booking.productTypeLabel || '—'}
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase text-muted-foreground block font-medium">{uiLabels.settlementStatus}</span>
                <span className="font-semibold text-foreground mt-0.5 capitalize block">
                  {booking.paymentStatus === 'paid'
                    ? uiLabels.fullySettled
                    : booking.paymentStatus === 'partially_paid'
                      ? uiLabels.partiallyPaid
                      : uiLabels.pending}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {booking.paymentStatus === 'partially_paid' && booking.outstandingBalance && (
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block font-medium">{uiLabels.balanceDue}:</span>
                  <span className="font-bold text-amber-500">{booking.outstandingBalance.formatted}</span>
                </div>
              )}
              {booking.status === 'pending_payment' ? (
                <Link href={`/checkout/${booking.reference || booking.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Complete Payment →
                  </Button>
                </Link>
              ) : booking.status === 'expired' ? (
                <Link href="/experiences">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Book Again →
                  </Button>
                </Link>
              ) : (
                <Link href={`/dashboard/bookings/${booking.reference || booking.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    {uiLabels.accessTravelDossier} →
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

export function DashboardOverviewPage({ data }: { data: CustomerPortalOverviewDTO }) {
  // Existing authoritative primary booking directly from server projection (no custom client sorting)
  const primaryBooking = data.recentBookings && data.recentBookings.length > 0 ? data.recentBookings[0] : null

  return (
    <div className="flex flex-col gap-8 flex-grow">
      {/* 5.1 Travel Home Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span>{data.uiLabels.personalTravelHome}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-hornbill font-light text-foreground">
          {data.uiLabels.welcomeBack}, <span className="font-normal text-secondary">{data.fullName}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-light">
          {data.uiLabels.welcomeSubtitle}
        </p>
      </div>

      {/* 5.1 Primary Journey Canvas */}
      {primaryBooking ? (
        <PrimaryJourneyCard booking={primaryBooking} uiLabels={data.uiLabels} />
      ) : (
        <div className="p-8 sm:p-12 rounded-3xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/30 text-secondary mx-auto flex items-center justify-center text-xs font-bold">
            LBV
          </div>
          <h2 className="text-2xl font-hornbill font-light text-foreground">
            {data.uiLabels.noActiveReservations}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {data.uiLabels.noActiveReservationsDesc}
          </p>
          <div className="pt-2">
            <Link href="/experiences">
              <Button variant="primary" size="md" className="font-bold shadow-md cursor-pointer">
                {data.uiLabels.exploreCuratedExperiences} →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 5.2 Personal Travel Wallet & Privileges Strip */}
      <PersonalTravelWallet data={data} />

      {/* 5.3 Recent Bookings Ledger */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-2xl font-serif font-light text-foreground">
              {data.uiLabels.recentReservationsTitle}
            </h2>
            <div className="h-1 w-12 bg-secondary mt-1" />
          </div>

          <Link href="/dashboard/bookings">
            <Button
              variant="outline"
              size="sm"
              className="uppercase text-xs font-semibold"
            >
              {data.uiLabels.viewAll} →
            </Button>
          </Link>
        </div>

        {data.recentBookings.length === 0 ? (
          <EmptyState
            title={data.uiLabels.noBookingsFound}
            description={data.uiLabels.noBookingsFoundDesc}
            icon="booking"
            actionLabel={data.uiLabels.exploreExperiencesBtn}
            actionHref="/experiences"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {data.recentBookings.map((booking) => (
              <RecentReservationRow key={booking.id} booking={booking} uiLabels={data.uiLabels} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


