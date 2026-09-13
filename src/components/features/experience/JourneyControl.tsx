'use client'

import React from 'react'
import Link from 'next/link'
import { CurrencyDisplay, Button } from '@/components/ui'
import type {
  ExperienceDetailsDTO,
  ChildPolicyDTO,
  FormattedCommercialBreakdown,
  DepartureSlotDTO,
} from '@/application/experience/dto-details'
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

/* Minimalist geometric stroke-based SVG icons */
function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

export interface JourneyControlProps {
  data: ExperienceDetailsDTO
  locale: string
  isPackage: boolean
  isFixedPackage: boolean
  isFlexiblePackage: boolean
  isDailyTour: boolean
  childPolicy?: ChildPolicyDTO
  childrenAllowed: boolean
  childSharingBedPercentage: number
  childExtraBedPercentage: number
  displayPrice: ConvertedPrice | null
  pricingState: {
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
    commercialBreakdown?: CommercialSnapshotBreakdown
    formattedBreakdown?: FormattedCommercialBreakdown
  } | null
  loadingPrice: boolean
  pricingError: string | null
  canBook: boolean
  // Departure selection
  selectedSlotId: number | null
  selectedDate: string
  selectedTime: string
  minDate: string
  calculatedEndDate: string | null
  isSelectedDateBlackedOut: boolean
  isTimeSlotInPast: (timeStr: string) => boolean
  // Guest & Room selection
  adults: number
  childrenCount: number
  childAges: number[]
  childBeddingModes: ('sharing_bed' | 'extra_bed')[]
  requestedRooms: number
  // Callbacks
  onSelectSlot: (id: number) => void
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onAdultsChange: (delta: number) => void
  onAddChild: () => void
  onRemoveChild: (index: number) => void
  onChildAgeChange: (index: number, age: number) => void
  onChildBeddingChange: (index: number, mode: 'sharing_bed' | 'extra_bed') => void
  onRequestedRoomsChange: (delta: number) => void
  onProceedToCheckout: () => void
}

export function JourneyControl({
  data,
  locale,
  isPackage,
  isFixedPackage,
  isFlexiblePackage,
  isDailyTour,
  childPolicy,
  childrenAllowed,
  childSharingBedPercentage,
  childExtraBedPercentage,
  displayPrice,
  pricingState,
  loadingPrice,
  pricingError,
  canBook,
  selectedSlotId,
  selectedDate,
  selectedTime,
  minDate,
  calculatedEndDate,
  isSelectedDateBlackedOut,
  isTimeSlotInPast,
  adults,
  childrenCount,
  childAges,
  childBeddingModes,
  requestedRooms,
  onSelectSlot,
  onSelectDate,
  onSelectTime,
  onAdultsChange,
  onAddChild,
  onRemoveChild,
  onChildAgeChange,
  onChildBeddingChange,
  onRequestedRoomsChange,
  onProceedToCheckout,
}: JourneyControlProps) {
  const availableDepartures: DepartureSlotDTO[] =
    isFixedPackage && 'departureSlots' in data.bookability
      ? (data.bookability.departureSlots as DepartureSlotDTO[]).filter((slot) => slot.status === 'available')
      : []

  const totalGuests = adults + childrenCount
  const guestUnit = totalGuests === 1
    ? (dict.get(locale, 'experience.guestSingular') || 'Guest')
    : (dict.get(locale, 'experience.guestPlural') || 'Guests')

  const roomUnit = requestedRooms === 1
    ? dict.get(locale, 'experience.roomSingular')
    : dict.get(locale, 'experience.roomPlural')

  return (
    <>
      {/* RIGHT COLUMN: THE JOURNEY CONTROL INSTRUMENT (5 Columns - Sticky) */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          {/* Single Cohesive Luxury Journey Control Panel */}
          <div className="rounded-3xl border border-border/80 bg-card shadow-2xl divide-y divide-border/60">
            {/* 1. Header: Financial Context & Live Price */}
            <div className="p-6 sm:p-7 bg-card-elevated/40 flex items-baseline justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                  {dict.get(locale, 'experience.fromPerAdult')}
                </span>
                {pricingState?.unitPrice ? (
                  <CurrencyDisplay
                    price={pricingState.unitPrice}
                    size="md"
                    className="font-hornbill font-light text-foreground"
                  />
                ) : (
                  <span className="text-xl font-hornbill text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider font-bold text-secondary block mb-1">
                  {dict.get(locale, 'experience.totalTripPrice') || 'Total Trip Price'}
                </span>
                {displayPrice ? (
                  <CurrencyDisplay
                    price={displayPrice}
                    size="lg"
                    className="font-hornbill font-bold text-foreground text-2xl sm:text-3xl"
                  />
                ) : (
                  <span className="text-2xl font-hornbill text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Not Bookable State */}
            {!data.bookability.isBookable ? (
              <div className="p-6 sm:p-8 flex flex-col gap-4">
                <div className="p-4 rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
                  <AlertIcon className="w-4 h-4 shrink-0 text-secondary" />
                  <span>
                    {isFixedPackage
                      ? dict.get(locale, 'experience.empty.noPackageSlots')
                      : isDailyTour
                        ? dict.get(locale, 'experience.empty.noTourSchedules')
                        : dict.get(locale, 'experience.empty.unavailable')}
                  </span>
                </div>
                <Link href="/experiences" className="w-full">
                  <Button variant="outline" size="lg" className="w-full font-semibold">
                    {dict.get(locale, 'experience.empty.exploreOther')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* 2. CHOOSE DEPARTURE DATE */}
                <div className="p-6 sm:p-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                        {dict.get(locale, 'experience.chooseDepartureDate') || dict.get(locale, 'experience.selectDepartureSlot')}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-card-elevated border border-border/40">
                      {isFixedPackage
                        ? (dict.get(locale, 'experience.fixedDeparture') || 'Fixed Departure')
                        : isDailyTour
                          ? (locale === 'ar' ? 'رحلة يومية' : 'Daily Tour')
                          : (locale === 'ar' ? 'تواريخ مرنة' : 'Flexible Dates')}
                    </span>
                  </div>

                  {/* Fixed Package Slots */}
                  {isFixedPackage && (
                    <div className="flex flex-col gap-3">
                      {availableDepartures.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
                          <ClockIcon className="w-4 h-4 shrink-0 text-secondary" />
                          <span>{dict.get(locale, 'experience.empty.noPackageSlots')}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
                          {availableDepartures.map((slot) => {
                            const isSelected = selectedSlotId === slot.id
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => onSelectSlot(slot.id)}
                                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 relative flex items-center justify-between gap-4 cursor-pointer ${
                                  isSelected
                                    ? 'border-secondary ring-1 ring-secondary/30 bg-secondary/10 shadow-sm'
                                    : 'border-border/70 hover:border-secondary/40 bg-card-elevated/40'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-secondary shrink-0" />
                                    <span className="font-hornbill text-sm font-semibold text-foreground">
                                      {slot.departureDate}
                                    </span>
                                  </div>
                                  <span className="text-xs text-accent font-semibold mt-1">
                                    {slot.availableSeats === 1
                                      ? dict.get(locale, 'experience.seatLeftSingle')
                                      : dict
                                          .get(locale, 'experience.seatsLeft')
                                          .replace('{count}', String(slot.availableSeats))}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary/20 shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flexible Package Date Picker */}
                  {isFlexiblePackage && (
                    <div className="flex flex-col gap-3">
                      <input
                        type="date"
                        value={selectedDate}
                        min={minDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-border/80 bg-card-elevated/50 text-base font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all text-foreground"
                      />
                      {isSelectedDateBlackedOut && (
                        <p className="text-xs text-accent font-semibold mt-1 flex items-center gap-1.5">
                          <AlertIcon className="w-4 h-4 shrink-0 text-accent" />
                          <span>{dict.get(locale, 'experience.blackoutDateNotice')}</span>
                        </p>
                      )}
                      {selectedDate && calculatedEndDate && (
                        <div className="p-4 rounded-2xl bg-card-elevated/50 border border-border/60 text-xs flex flex-col gap-2">
                          <div className="flex items-center justify-between font-medium text-muted-foreground">
                            <span>{dict.get(locale, 'experience.tripDuration')}</span>
                            <span className="text-foreground font-semibold text-sm">
                              {data.formattedDuration}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-semibold text-secondary text-sm">
                            <span>{dict.get(locale, 'experience.returnDate')}</span>
                            <span>{calculatedEndDate}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daily Tour Schedule */}
                  {isDailyTour && (
                    <div className="flex flex-col gap-4">
                      <input
                        type="date"
                        value={selectedDate}
                        min={minDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-border/80 bg-card-elevated/50 text-base font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all text-foreground"
                      />
                      {data.schedules && data.schedules.length > 0 && (
                        <div className="grid grid-cols-2 gap-2.5">
                          {data.schedules.map((schedule) => {
                            const isSlotPast = isTimeSlotInPast(schedule.startTime)
                            const isSelected = selectedTime === schedule.startTime
                            return (
                              <button
                                key={schedule.startTime}
                                type="button"
                                disabled={isSlotPast}
                                onClick={() => !isSlotPast && onSelectTime(schedule.startTime)}
                                className={`p-3 rounded-2xl border text-center text-xs font-semibold transition-all ${
                                  isSlotPast
                                    ? 'opacity-40 border-border/40 bg-card-elevated/20 cursor-not-allowed text-muted-foreground'
                                    : isSelected
                                      ? 'border-secondary ring-1 ring-secondary/30 bg-secondary/10 text-foreground'
                                      : 'border-border/70 hover:border-secondary/40 bg-card-elevated/40 text-foreground'
                                }`}
                              >
                                <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                  <ClockIcon className="w-3.5 h-3.5 text-secondary" />
                                  <span>{schedule.startTime}</span>
                                </div>
                                {isSlotPast ? (
                                  <span className="block text-[10px] text-muted-foreground/60 line-through mt-0.5 font-medium">
                                    {dict.get(locale, 'experience.passed')}
                                  </span>
                                ) : schedule.label ? (
                                  <span className="block text-[10px] text-muted-foreground mt-0.5 font-normal">
                                    {schedule.label}
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. WHO IS TRAVELLING? */}
                <div className="p-6 sm:p-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                        {dict.get(locale, 'experience.whoIsTravelling')}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {adults} {adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')}
                      {childrenCount > 0
                        ? ` · ${childrenCount} ${childrenCount === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}`
                        : ''}
                    </span>
                  </div>

                  {/* Adults Stepper */}
                  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-card-elevated/40 border border-border/60">
                    <div>
                      <span className="font-semibold block text-sm text-foreground">
                        {dict.get(locale, 'experience.adults')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dict.get(locale, 'experience.adultsAgeHint') || 'Age 12+'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={adults <= 1}
                        onClick={() => onAdultsChange(-1)}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated disabled:opacity-30 disabled:cursor-not-allowed text-foreground transition-colors cursor-pointer"
                        aria-label={dict.get(locale, 'experience.aria.decreaseAdults')}
                      >
                        −
                      </button>
                      <span className="font-hornbill text-base font-semibold w-6 text-center text-foreground">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdultsChange(1)}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated text-foreground transition-colors cursor-pointer"
                        aria-label={dict.get(locale, 'experience.aria.increaseAdults')}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children Stepper */}
                  {childrenAllowed && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-card-elevated/40 border border-border/60">
                        <div>
                          <span className="font-semibold block text-sm text-foreground">
                            {dict.get(locale, 'experience.children')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dict.get(locale, 'experience.childrenAgeHint') || 'Age 0–11'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={childrenCount <= 0}
                            onClick={() => onRemoveChild(childrenCount - 1)}
                            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated disabled:opacity-30 disabled:cursor-not-allowed text-foreground transition-colors cursor-pointer"
                            aria-label={dict.get(locale, 'experience.aria.decreaseChildren')}
                          >
                            −
                          </button>
                          <span className="font-hornbill text-base font-semibold w-6 text-center text-foreground">
                            {childrenCount}
                          </span>
                          <button
                            type="button"
                            onClick={onAddChild}
                            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated text-foreground transition-colors cursor-pointer"
                            aria-label={dict.get(locale, 'experience.aria.increaseChildren')}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Individual Child Customization */}
                      {childrenCount > 0 && (
                        <div className="space-y-3 pt-1">
                          {childAges.map((age, idx) => {
                            const isInfant = age < 2
                            const currentMode = childBeddingModes[idx] || 'sharing_bed'
                            return (
                              <div
                                key={idx}
                                className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card-elevated/30 flex flex-col gap-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase text-secondary">
                                    {dict
                                      .get(locale, 'experience.childIndexLabel')
                                      .replace('{index}', String(idx + 1))}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground">
                                      {dict.get(locale, 'experience.childAge')}:
                                    </label>
                                    <select
                                      value={age}
                                      onChange={(e) =>
                                        onChildAgeChange(idx, Number(e.target.value))
                                      }
                                      className="p-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground"
                                    >
                                      {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                                        <option key={a} value={a}>
                                          {a}{' '}
                                          {a === 1
                                            ? dict.get(locale, 'experience.yearSingular')
                                            : dict.get(locale, 'experience.yearPlural')}{' '}
                                          {a < 2
                                            ? dict.get(locale, 'experience.infantCategory')
                                            : a >= 12
                                              ? dict.get(locale, 'experience.adultCategory')
                                              : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {isInfant ? (
                                  <div className="text-xs font-medium text-secondary bg-secondary/10 border border-secondary/20 p-2.5 rounded-xl">
                                    {dict.get(locale, 'experience.infantSharingNotice')}
                                  </div>
                                ) : age < 12 ? (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">
                                      {dict.get(locale, 'experience.beddingPreference')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => onChildBeddingChange(idx, 'sharing_bed')}
                                        className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                                          currentMode === 'sharing_bed'
                                            ? 'border-secondary ring-1 ring-secondary/30 bg-secondary/10 text-foreground'
                                            : 'border-border/70 bg-card hover:border-secondary/40 text-foreground'
                                        }`}
                                      >
                                        <span className="block font-semibold text-xs text-foreground">
                                          {dict.get(locale, 'experience.sharingBed')}
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                                          {dict.get(locale, 'experience.sharingBedDesc')}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onChildBeddingChange(idx, 'extra_bed')}
                                        className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                                          currentMode === 'extra_bed'
                                            ? 'border-secondary ring-1 ring-secondary/30 bg-secondary/10 text-foreground'
                                            : 'border-border/70 bg-card hover:border-secondary/40 text-foreground'
                                        }`}
                                      >
                                        <span className="block font-semibold text-xs text-foreground">
                                          {dict.get(locale, 'experience.extraBed')}
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                                          {dict.get(locale, 'experience.extraBedDesc')}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. YOUR ROOMS */}
                {isPackage && (
                  <div className="p-6 sm:p-7 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                          {dict.get(locale, 'experience.yourRooms')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {requestedRooms} {roomUnit} · {totalGuests} {guestUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-card-elevated/40 border border-border/60">
                      <div>
                        <span className="font-semibold block text-sm text-foreground">
                          {dict.get(locale, 'experience.rooms')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dict.get(locale, 'experience.totalRequestedRooms')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={requestedRooms <= 1}
                          onClick={() => onRequestedRoomsChange(-1)}
                          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated disabled:opacity-30 disabled:cursor-not-allowed text-foreground transition-colors cursor-pointer"
                          aria-label={dict.get(locale, 'experience.aria.decreaseRooms')}
                        >
                          −
                        </button>
                        <span className="font-hornbill text-base font-semibold w-6 text-center text-foreground">
                          {requestedRooms}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRequestedRoomsChange(1)}
                          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center font-bold text-base hover:bg-card-elevated text-foreground transition-colors cursor-pointer"
                          aria-label={dict.get(locale, 'experience.aria.increaseRooms')}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Room Breakdown Projection - Compact Mini Cards */}
                    {pricingState?.commercialBreakdown?.roomAllocation && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {pricingState.commercialBreakdown.roomAllocation.map((rm) => {
                          const occLabel =
                            dict.get(locale, `experience.occupancy.${rm.occupancy}Room`) ||
                            `${rm.occupancy.charAt(0).toUpperCase() + rm.occupancy.slice(1)} Room`
                          const adultLabel =
                            rm.adults === 1
                              ? dict.get(locale, 'experience.adultSingular')
                              : dict.get(locale, 'experience.adultPlural')
                          return (
                            <div
                              key={rm.roomIndex}
                              className="p-3 rounded-xl bg-card-elevated/50 border border-border/70 flex flex-col gap-1 transition-all"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-secondary uppercase">
                                <span className="flex items-center gap-1.5">
                                  <BedIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                                  <span>
                                    {dict
                                      .get(locale, 'experience.roomIndex')
                                      .replace('{index}', String(rm.roomIndex))}
                                  </span>
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                {rm.adults} {adultLabel} · {occLabel}
                                {rm.children > 0 &&
                                  ` + ${rm.children} ${rm.children === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing Error Alert */}
                {pricingError && (
                  <div className="p-4 mx-6 my-2 rounded-2xl border border-accent/30 bg-accent/10 text-accent text-xs font-medium flex flex-col gap-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertIcon className="w-4 h-4 shrink-0 text-accent" />
                      <span>{pricingError}</span>
                    </div>
                    <p className="text-[11px] text-accent/80 font-normal">
                      {dict.get(locale, 'experience.pricingErrorHint')}
                    </p>
                  </div>
                )}

                {/* 5. PRICE SUMMARY */}
                {pricingState?.commercialBreakdown && (
                  <div className="p-6 sm:p-7 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                          {dict.get(locale, 'experience.priceSummary') || 'Price Summary'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-card-elevated border border-border/40">
                        {dict.get(locale, 'experience.commercialSsotBadge') || 'Transparent Pricing'}
                      </span>
                    </div>

                    {/* Journey Base Price Row */}
                    <div className="flex items-center justify-between text-xs sm:text-sm text-foreground/80 py-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {dict.get(locale, 'experience.journeyPrice') || 'Journey Price'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {adults} {adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')} × {pricingState.formattedBreakdown?.adultBasePrice.formatted || pricingState.unitPrice.formatted}
                        </span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {pricingState.formattedBreakdown?.adultsTotalPrice.formatted ||
                          pricingState.totalPrice.formatted}
                      </span>
                    </div>

                    {/* Children Rows (if any) */}
                    {pricingState.commercialBreakdown.children &&
                      pricingState.commercialBreakdown.children.length > 0 &&
                      pricingState.commercialBreakdown.children.map((ch, idx) => {
                        const formattedCh = pricingState.formattedBreakdown?.children?.[idx]
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs sm:text-sm text-foreground/80 py-1"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {dict.get(locale, 'experience.childIndex').replace('{index}', String(idx + 1))}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {ch.age} {ch.age === 1 ? dict.get(locale, 'experience.yearSingular') : dict.get(locale, 'experience.yearPlural')} · {ch.category === 'infant' ? dict.get(locale, 'experience.infantCategory') : ch.beddingMode === 'sharing_bed' ? dict.get(locale, 'experience.sharingBed') : dict.get(locale, 'experience.extraBed')}
                              </span>
                            </div>
                            <span className="font-semibold text-foreground">
                              {ch.priceEGP === 0
                                ? dict.get(locale, 'experience.free')
                                : formattedCh?.price.formatted || ''}
                            </span>
                          </div>
                        )
                      })}

                    {/* Luxury Accommodations Row (if > 0) */}
                    {pricingState.commercialBreakdown.accommodationTotalEGP > 0 && (
                      <div className="flex items-center justify-between text-xs sm:text-sm text-foreground/80 py-1">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {dict.get(locale, 'experience.luxuryAccommodations') || 'Luxury Accommodations'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {pricingState.formattedBreakdown?.staysBreakdown?.length || 0}{' '}
                            {locale === 'ar' ? 'إقامات' : 'stays'} · {requestedRooms}{' '}
                            {roomUnit}
                          </span>
                        </div>
                        <span className="font-semibold text-foreground">
                          {pricingState.formattedBreakdown?.accommodationTotalPrice?.formatted ||
                            ''}
                        </span>
                      </div>
                    )}

                    {/* Total Trip Price Divider & Row */}
                    <div className="flex items-baseline justify-between pt-3 border-t border-border/60 mt-1">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase font-bold text-foreground tracking-wider">
                          {dict.get(locale, 'experience.totalTripPrice') || 'Total Trip Price'}
                        </span>
                      </div>
                      <div
                        className={
                          loadingPrice
                            ? 'opacity-50 transition-opacity duration-200'
                            : 'transition-opacity duration-200'
                        }
                      >
                        {displayPrice ? (
                          <CurrencyDisplay
                            price={displayPrice}
                            size="lg"
                            className="font-hornbill font-light text-2xl sm:text-3xl text-foreground"
                          />
                        ) : (
                          <span className="text-xl font-hornbill text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. PRIMARY ACTION */}
                <div className="p-6 sm:p-7 bg-card-elevated/30">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-semibold shadow-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-base"
                    disabled={!canBook || loadingPrice}
                    onClick={onProceedToCheckout}
                  >
                    {loadingPrice ? (
                      <span>{dict.get(locale, 'experience.updatingCalculation')}</span>
                    ) : displayPrice ? (
                      <span>
                        {displayPrice.formatted} · {dict.get(locale, 'experience.bookThisJourney')}
                      </span>
                    ) : (
                      <span>{dict.get(locale, 'experience.configureBooking')}</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-card/95 backdrop-blur-md border-t border-border lg:hidden flex items-center justify-between gap-4 shadow-2xl">
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-bold block">
            {dict.get(locale, 'experience.totalTripPrice') || 'Total Trip Price'}
          </span>
          {displayPrice ? (
            <CurrencyDisplay
              price={displayPrice}
              size="md"
              className="font-hornbill font-bold text-foreground text-lg"
            />
          ) : (
            <span className="text-base font-bold text-muted-foreground">—</span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          className="font-semibold shadow-lg flex-1 max-w-[220px] active:scale-[0.98] transition-transform text-sm"
          disabled={!canBook || loadingPrice}
          onClick={onProceedToCheckout}
        >
          {loadingPrice
            ? dict.get(locale, 'experience.updatingCalculation')
            : dict.get(locale, 'experience.bookJourneyShort')}
        </Button>
      </div>
    </>
  )
}
