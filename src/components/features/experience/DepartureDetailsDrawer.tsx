'use client'

import React, { useEffect, useRef } from 'react'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { DestinationStopDTO } from '@/application/experience/dto-details'
import { Button } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

/* Minimalist geometric SVG icons */
function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SeatIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 18v3a1 1 0 001 1h2a1 1 0 001-1v-3h8v3a1 1 0 001 1h2a1 1 0 001-1v-3h1a2 2 0 002-2V9a4 4 0 00-4-4h-2V3a1 1 0 00-1-1H8a1 1 0 00-1 1v2H5a4 4 0 00-4 4v7a2 2 0 002 2h1zm2-13h12a2 2 0 012 2v7H4V7a2 2 0 012-2z" />
    </svg>
  )
}

/**
 * Format 24-hour time "HH:mm" to human-friendly 12-hour AM/PM format.
 */
function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (isNaN(h) || isNaN(m)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = m < 10 ? `0${m}` : `${m}`
  return `${displayH}:${displayM} ${period}`
}

/**
 * Format date string "YYYY-MM-DD" to human-friendly weekday, day, month, year.
 */
function formatHumanDateDetailed(dateStr: string, locale: string): { formatted: string; weekday: string } {
  if (!dateStr) return { formatted: '', weekday: '' }
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return { formatted: dateStr, weekday: '' }
    const d = new Date(Date.UTC(year, month - 1, day))
    const formatted = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
    const weekday = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      timeZone: 'UTC',
      weekday: 'long',
    }).format(d)
    return { formatted, weekday }
  } catch {
    return { formatted: dateStr, weekday: '' }
  }
}

export interface DepartureDetailsDrawerProps {
  isOpen: boolean
  onClose: () => void
  departureDate: string
  startTime?: string
  destinationTimezone?: string
  availableSeats: number
  totalCapacity?: number
  heldSeats?: number
  soldSeats?: number
  duration?: string
  experienceType?: string
  destinations?: DestinationStopDTO[]
  heroImage?: string
  price?: ConvertedPrice | null
  unitPrice?: ConvertedPrice | null
  loadingPrice?: boolean
  canBook?: boolean
  locale: string
  onProceedToCheckout?: () => void
}

export function DepartureDetailsDrawer({
  isOpen,
  onClose,
  departureDate,
  startTime,
  destinationTimezone,
  availableSeats,
  totalCapacity,
  heldSeats,
  soldSeats: _soldSeats,
  duration: _duration,
  experienceType: _experienceType,
  destinations: _destinations,
  heroImage,
  price: _price,
  unitPrice: _unitPrice,
  loadingPrice: _loadingPrice,
  canBook: _canBook,
  locale,
  onProceedToCheckout: _onProceedToCheckout,
}: DepartureDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Manage body scroll lock and focus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Format date and time
  const { formatted: formattedDate, weekday } = formatHumanDateDetailed(departureDate, locale)
  const formattedTime = startTime ? formatTimeTo12Hour(startTime) : undefined

  // Safe capacity progress evaluation
  const hasValidCapacityRatio =
    typeof totalCapacity === 'number' &&
    totalCapacity > 0 &&
    typeof availableSeats === 'number' &&
    availableSeats >= 0 &&
    availableSeats <= totalCapacity

  const capacityRatioPct = hasValidCapacityRatio && totalCapacity
    ? Math.min(100, Math.max(0, Math.round((availableSeats / totalCapacity) * 100)))
    : null

  const isSoldOut = availableSeats === 0
  const isLimitedAvailability = !isSoldOut && availableSeats <= 4

  // Generate seat matrix indicators when totalCapacity is known and compact (<= 24)
  const shouldRenderSeatMatrix = hasValidCapacityRatio && totalCapacity && totalCapacity <= 24

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={dict.get(locale, 'experience.departureDossier') || 'Departure Dossier'}
    >
      {/* Backdrop overlay with smooth fade */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface Drawer: Side-Sheet on Desktop (sm+), Bottom-Sheet on Mobile */}
      <div className="relative z-10 w-full sm:max-w-lg lg:max-w-xl h-full max-h-screen bg-[#faf8f5] dark:bg-[#171514] text-foreground shadow-2xl border-l border-slate-200 dark:border-secondary/25 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Scrollable Container */}
        <div>
          {/* 1. HERO HEADER: Gallery Backdrop with Dark Atmospheric Gradient */}
          <div className="relative w-full min-h-[220px] sm:min-h-[240px] overflow-hidden bg-[#171514] flex flex-col justify-between p-6 sm:p-7 text-white border-b border-white/10">
            {/* Gallery Image Layer with Graceful Fallback */}
            {heroImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out scale-105"
                style={{ backgroundImage: `url(${heroImage})` }}
                aria-hidden="true"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#1a1e4e] via-[#252a6b] to-[#171514]"
                aria-hidden="true"
              />
            )}

            {/* Atmospheric Multi-Stop Dark Gradient Overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#171514] via-[#171514]/85 to-[#171514]/40 pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-black/20 pointer-events-none"
              aria-hidden="true"
            />

            {/* Top Navigation Row: Dossier Badge & Luxury Close Button */}
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/20 dark:bg-accent/25 border border-accent/40 backdrop-blur-md text-accent text-[11px] font-bold uppercase tracking-wider shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>{dict.get(locale, 'experience.departureDossier') || 'Departure Dossier'}</span>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={dict.get(locale, 'experience.close') || 'Close'}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Hero Focus: Departure Date & Local Time */}
            <div className="relative z-10 mt-6 flex flex-col gap-2">
              {weekday && (
                <span className="text-xs uppercase font-bold tracking-widest text-accent drop-shadow-xs">
                  {weekday}
                </span>
              )}
              <h2 className="font-hornbill text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
                {formattedDate || departureDate}
              </h2>

              {formattedTime && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm text-white/95 font-medium self-start mt-1">
                  <ClockIcon className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-bold text-white">{formattedTime}</span>
                  {destinationTimezone && (
                    <span className="text-white/75 font-normal">
                      · {destinationTimezone} ({dict.get(locale, 'experience.localTime') || 'Local time'})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. DRAWER DOSSIER BODY */}
          <div className="p-5 sm:p-7 flex flex-col gap-6">

            {/* AUTHORITATIVE SEAT AVAILABILITY & CAPACITY DOSSIER */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1e1c1a] border border-slate-200/90 dark:border-secondary/25 flex flex-col gap-5 shadow-sm transition-all">
              
              {/* Header Row: Label & Status Badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center shrink-0 shadow-2xs">
                    <SeatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-extrabold text-[#1a1e4e] dark:text-secondary tracking-wider">
                      {dict.get(locale, 'experience.bookingStatus') || 'Booking Status'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {dict.get(locale, 'experience.selectedDeparture') || 'Selected Departure'}
                    </span>
                  </div>
                </div>

                {/* Customer-Facing Availability Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-2xs ${
                    isSoldOut
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      : isLimitedAvailability
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSoldOut ? 'bg-red-500' : isLimitedAvailability ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isSoldOut
                    ? dict.get(locale, 'experience.soldOut') || 'Sold Out'
                    : isLimitedAvailability
                      ? dict.get(locale, 'experience.seatsLeft').replace('{count}', String(availableSeats))
                      : dict.get(locale, 'experience.openForBooking') || 'Open for booking'}
                </span>
              </div>

              {/* Key Metrics Highlight Row */}
              <div className={`grid gap-3 pt-1 ${typeof heldSeats === 'number' && heldSeats > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Metric 1: Available Seats */}
                <div className="p-3.5 rounded-xl bg-[#faf8f5] dark:bg-[#151413] border border-slate-200/80 dark:border-secondary/20 flex flex-col">
                  <span className="font-hornbill text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {availableSeats}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                    {dict.get(locale, 'experience.legendAvailable') || 'Available'}
                  </span>
                </div>

                {/* Metric 2: On Hold (if active) */}
                {typeof heldSeats === 'number' && heldSeats > 0 && (
                  <div className="p-3.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 flex flex-col">
                    <span className="font-hornbill text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                      {heldSeats}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      {dict.get(locale, 'experience.legendOnHold') || 'On hold'}
                    </span>
                  </div>
                )}

                {/* Metric 3: Total Capacity */}
                {hasValidCapacityRatio && totalCapacity && (
                  <div className="p-3.5 rounded-xl bg-[#faf8f5] dark:bg-[#151413] border border-slate-200/80 dark:border-secondary/20 flex flex-col">
                    <span className="font-hornbill text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      {totalCapacity}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                      {dict.get(locale, 'experience.totalCapacity') || 'Total Seats'}
                    </span>
                  </div>
                )}
              </div>

              {/* Visual Seat Matrix Tokens (Airline-Grade Matrix for realistic capacities <= 24) */}
              {shouldRenderSeatMatrix && totalCapacity && (
                <div className="pt-2 flex flex-col gap-3">
                  <div
                    className="grid gap-1.5 p-3 rounded-xl bg-[#faf8f5] dark:bg-[#151413] border border-slate-200/80 dark:border-secondary/20"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(totalCapacity, 12)}, minmax(0, 1fr))`,
                    }}
                    role="img"
                    aria-label={`${availableSeats} of ${totalCapacity} seats available`}
                  >
                    {Array.from({ length: totalCapacity }).map((_, idx) => {
                      const isSeatAvailable = idx < availableSeats
                      const isSeatOnHold =
                        !isSeatAvailable &&
                        typeof heldSeats === 'number' &&
                        heldSeats > 0 &&
                        idx < availableSeats + heldSeats

                      return (
                        <div
                          key={idx}
                          title={
                            isSeatAvailable
                              ? (dict.get(locale, 'experience.legendAvailable') || 'Available')
                              : isSeatOnHold
                                ? (dict.get(locale, 'experience.legendOnHold') || 'On hold')
                                : (dict.get(locale, 'experience.legendBooked') || 'Booked')
                          }
                          className={`h-6 rounded-md flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                            isSeatAvailable
                              ? 'bg-amber-500 dark:bg-amber-600 text-white shadow-xs'
                              : isSeatOnHold
                                ? 'bg-sky-500/20 dark:bg-sky-500/30 text-sky-600 dark:text-sky-400 border border-sky-500/50 shadow-xs'
                                : 'bg-red-500/15 dark:bg-red-500/25 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSeatAvailable
                                ? 'bg-white'
                                : isSeatOnHold
                                  ? 'bg-sky-500 animate-pulse'
                                  : 'bg-red-500 dark:bg-red-400'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Visual Seat Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-muted-foreground font-medium px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="font-semibold text-foreground">{dict.get(locale, 'experience.legendAvailable') || 'Available'}</span>
                    </div>
                    {typeof heldSeats === 'number' && heldSeats > 0 && (
                      <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                        <span>{dict.get(locale, 'experience.legendOnHold') || 'On hold'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="font-semibold text-foreground">{dict.get(locale, 'experience.legendBooked') || 'Booked'}</span>
                    </div>
                  </div>

                  {/* Active Hold Reassurance Banner (Rendered ONLY when heldSeats > 0) */}
                  {typeof heldSeats === 'number' && heldSeats > 0 && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-600 dark:text-sky-400 font-medium shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                      <span>
                        {heldSeats === 1
                          ? dict.get(locale, 'experience.seatOnHoldSingle') || '1 seat on hold'
                          : (dict.get(locale, 'experience.seatsOnHold') || '{count} seats on hold').replace(
                              '{count}',
                              String(heldSeats),
                            )}
                        {' · '}
                        {dict.get(locale, 'experience.onHoldAwaitingConfirmation') || 'Awaiting confirmation'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Capacity Percentage Progress Track */}
              {hasValidCapacityRatio && capacityRatioPct !== null && totalCapacity && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-secondary/15">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>
                      {(dict.get(locale, 'experience.capacityProgress') || '{available} of {total} seats available')
                        .replace('{available}', String(availableSeats))
                        .replace('{total}', String(totalCapacity))}
                    </span>
                    <span className="font-bold text-foreground">{capacityRatioPct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-card overflow-hidden border border-slate-200/80 dark:border-secondary/20">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isSoldOut
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${capacityRatioPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. FOOTER ACTION SURFACE */}
        <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-secondary/20 bg-white dark:bg-[#171514] flex items-center justify-end shadow-lg">
          <Button
            variant="accent"
            size="lg"
            onClick={onClose}
            className="w-full font-bold text-sm shadow-lg shadow-accent/20 active:scale-[0.99] transition-all cursor-pointer py-3.5 flex items-center justify-center gap-2"
          >
            <span>{dict.get(locale, 'experience.close') || 'Close'}</span>
          </Button>
        </div>

      </div>
    </div>
  )
}
