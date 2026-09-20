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
import type { RoomAllocationOption, OccupancyType } from '@/domains/experience/room-allocation-policy'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import { DepartureDetailsDrawer } from './DepartureDetailsDrawer'
import { RoomArrangementModal } from './RoomArrangementModal'
import { AccommodationSelectionModal } from './AccommodationSelectionModal'
import type { AccommodationStayDTO } from '@/application/experience/dto-details'

const dict = new JsonTranslationDictionary()

function BuildingIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function formatOptionLabel(option: RoomAllocationOption, locale: string): string {
  const counts: Record<string, number> = {}
  option.rooms.forEach((r) => {
    counts[r.occupancy] = (counts[r.occupancy] || 0) + 1
  })

  const order = ['quad', 'triple', 'double', 'single']
  const parts: string[] = []

  const labelsEn: Record<string, { singular: string; plural: string }> = {
    quad: { singular: '1 Quad Room', plural: '{n} Quad Rooms' },
    triple: { singular: '1 Triple Room', plural: '{n} Triple Rooms' },
    double: { singular: '1 Double Room', plural: '{n} Double Rooms' },
    single: { singular: '1 Single Room', plural: '{n} Single Rooms' },
  }

  const labelsAr: Record<string, { singular: string; plural: string }> = {
    quad: { singular: '1 غرفة رباعية', plural: '{n} غرف رباعية' },
    triple: { singular: '1 غرفة ثلاثية', plural: '{n} غرف ثلاثية' },
    double: { singular: '1 غرفة مزدوجة', plural: '{n} غرف مزدوجة' },
    single: { singular: '1 غرفة مفردة', plural: '{n} غرف مفردة' },
  }

  const dictMap = locale === 'ar' ? labelsAr : labelsEn

  order.forEach((occ) => {
    const c = counts[occ]
    if (c > 0) {
      const template = c === 1 ? dictMap[occ].singular : dictMap[occ].plural.replace('{n}', String(c))
      parts.push(template)
    }
  })

  return parts.join(locale === 'ar' ? ' + ' : ' + ')
}

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

function formatHumanDateCompact(dateStr: string, locale: string): string {
  if (!dateStr) return ''
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const d = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
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
    availableAllocationOptions?: RoomAllocationOption[]
    selectedAllocationId?: string
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
  selectedAllocationId?: string | null
  selectedAccommodationOptions?: Record<number, string>
  // Callbacks
  onSelectSlot: (id: number) => void
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onAdultsChange: (delta: number) => void
  onAddChild: () => void
  onRemoveChild: (index: number) => void
  onChildAgeChange: (index: number, age: number) => void
  onChildBeddingChange: (index: number, mode: 'sharing_bed' | 'extra_bed') => void
  onSelectAllocation?: (id: string) => void
  onApplyAllocationAsync?: (id: string) => Promise<boolean>
  onSelectAccommodationOption?: (stayOrder: number, optionId: string) => void
  onProceedToCheckout: () => void
}

export function JourneyControl({
  data,
  locale,
  isPackage,
  isFixedPackage,
  isFlexiblePackage,
  isDailyTour,
  childPolicy: _childPolicy,
  childrenAllowed,
  childSharingBedPercentage: _childSharingBedPercentage,
  childExtraBedPercentage: _childExtraBedPercentage,
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
  selectedAllocationId,
  selectedAccommodationOptions = {},
  onSelectSlot,
  onSelectDate,
  onSelectTime,
  onAdultsChange,
  onAddChild,
  onRemoveChild,
  onChildAgeChange,
  onChildBeddingChange,
  onSelectAllocation,
  onApplyAllocationAsync,
  onSelectAccommodationOption,
  onProceedToCheckout,
}: JourneyControlProps) {
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = React.useState(false)
  const [isArrangementModalOpen, setIsArrangementModalOpen] = React.useState(false)
  const [isRoomsAccordionOpen, setIsRoomsAccordionOpen] = React.useState(false)
  const [activeAccommodationModalStayOrder, setActiveAccommodationModalStayOrder] = React.useState<number | null>(null)

  const accommodations = (data as { accommodations?: AccommodationStayDTO[] }).accommodations || []
  const modalStay = accommodations.find((s) => s.order === activeAccommodationModalStayOrder)

  const availableDepartures: DepartureSlotDTO[] =
    isFixedPackage && 'departureSlots' in data.bookability
      ? (data.bookability.departureSlots as DepartureSlotDTO[]).filter((slot) => slot.status === 'available')
      : []

  const selectedSlot = isFixedPackage
    ? availableDepartures.find((slot) => slot.id === selectedSlotId) || null
    : null

  const totalGuests = adults + childrenCount
  const guestUnit = totalGuests === 1
    ? (dict.get(locale, 'experience.guestSingular') || 'Guest')
    : (dict.get(locale, 'experience.guestPlural') || 'Guests')

  const availableOptions = pricingState?.availableAllocationOptions || []
  const activeOptionId =
    (selectedAllocationId && availableOptions.some((o) => o.id === selectedAllocationId))
      ? selectedAllocationId
      : pricingState?.selectedAllocationId ||
        availableOptions.find((o) => o.isRecommended)?.id ||
        availableOptions[0]?.id ||
        null

  const activeOption = availableOptions.find((o) => o.id === activeOptionId) || null

  // Authoritative active room allocation (SSOT: strictly from selected option or pricing breakdown)
  const activeAllocation =
    activeOption?.rooms ||
    pricingState?.commercialBreakdown?.roomAllocation ||
    null

  const activeRoomCount = activeAllocation && activeAllocation.length > 0 ? activeAllocation.length : null
  const roomUnit = activeRoomCount === 1
    ? (dict.get(locale, 'experience.roomSingular') || 'Room')
    : (dict.get(locale, 'experience.roomPlural') || 'Rooms')

  const supportedOccupancies = React.useMemo(() => {
    const set = new Set<OccupancyType>()
    availableOptions.forEach((opt) => {
      opt.rooms.forEach((r) => set.add(r.occupancy))
    })
    const order: OccupancyType[] = ['single', 'double', 'triple', 'quad']
    const res = order.filter((occ) => set.has(occ))
    return res.length > 0 ? res : (['single', 'double', 'triple', 'quad'] as OccupancyType[])
  }, [availableOptions])

  return (
    <>
      {/* RIGHT COLUMN: THE JOURNEY CONTROL INSTRUMENT (5 Columns - Sticky) */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          {/* Single Cohesive Luxury Journey Control Panel */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-secondary/25 bg-white dark:bg-[#171514] text-foreground shadow-xl dark:shadow-2xl transition-colors duration-300">
            {/* Ambient Corner Accent Glow */}
            <div
              className="absolute -top-16 -right-16 rtl:-left-16 rtl:-right-auto w-56 h-56 rounded-full bg-primary/5 dark:bg-secondary/10 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-16 -left-16 rtl:-right-16 rtl:-left-auto w-56 h-56 rounded-full bg-accent/8 dark:bg-accent/10 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            {/* 1. Header: Financial Context */}
            <div className="relative z-10 p-6 sm:p-7 bg-gradient-to-r from-[#1a1e4e] via-[#252a6b] to-[#2e3192] dark:bg-[#171514]/90 dark:bg-none flex items-center justify-between gap-4 text-white transition-colors duration-300 shadow-md">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-white/70 dark:text-muted-foreground block mb-1">
                  {dict.get(locale, 'experience.fromPerAdult')}
                </span>
                {pricingState?.unitPrice ? (
                  <CurrencyDisplay
                    price={pricingState.unitPrice}
                    size="lg"
                    className="font-hornbill font-bold text-white text-2xl sm:text-3xl"
                  />
                ) : (
                  <span className="text-2xl font-hornbill text-white/40 dark:text-muted-foreground">—</span>
                )}
              </div>
              {data.formattedDuration && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 dark:bg-card/40 border border-white/20 dark:border-secondary/20 backdrop-blur-xs text-xs font-semibold text-white">
                  <ClockIcon className="w-3.5 h-3.5 text-[#F9A825] dark:text-secondary shrink-0" />
                  <span>{data.formattedDuration}</span>
                </div>
              )}
            </div>

            {/* Not Bookable State */}
            {!data.bookability.isBookable ? (
              <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-4 bg-white dark:bg-transparent">
                <div className="p-4 rounded-2xl border border-secondary/25 bg-secondary/10 text-secondary text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
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
                  <Button variant="outline" size="lg" className="w-full font-semibold border-secondary/30 hover:bg-secondary/10 text-secondary bg-white dark:bg-transparent">
                    {dict.get(locale, 'experience.empty.exploreOther')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* 2. CHOOSE DEPARTURE DATE */}
                <div className="relative z-10 p-6 sm:p-7 flex flex-col gap-4 border-t-2 border-primary/10 dark:border-secondary/15 bg-white dark:bg-transparent transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-primary dark:bg-secondary flex items-center justify-center">
                        <CalendarIcon className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="text-sm font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wide">
                        {dict.get(locale, 'experience.chooseDepartureDate') || dict.get(locale, 'experience.selectDepartureSlot')}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase text-white dark:text-secondary font-bold px-3 py-1 rounded-full bg-primary dark:bg-secondary/15 dark:text-secondary border-0 dark:border dark:border-secondary/25">
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
                        <div className="p-4 rounded-2xl border border-secondary/25 bg-secondary/10 text-secondary text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
                          <ClockIcon className="w-4 h-4 shrink-0 text-secondary" />
                          <span>{dict.get(locale, 'experience.empty.noPackageSlots')}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                          {availableDepartures.map((slot) => {
                            const isSelected = selectedSlotId === slot.id
                            const isSlotSoldOut = slot.availableSeats === 0
                            const isLowAvailability = !isSlotSoldOut && slot.availableSeats <= 4
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => onSelectSlot(slot.id)}
                                className={`group p-3.5 sm:p-4 rounded-2xl text-left rtl:text-right transition-all duration-200 relative flex items-center justify-between gap-3.5 cursor-pointer border ${
                                  isSelected
                                    ? 'border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/30 bg-primary/[0.06] dark:bg-secondary/20 shadow-sm'
                                    : 'border-slate-200/80 dark:border-secondary/20 bg-white dark:bg-card/60 hover:border-primary/40 dark:hover:border-secondary/50 hover:bg-slate-50/60 dark:hover:bg-secondary/5 shadow-xs'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-primary text-white dark:bg-secondary'
                                        : 'bg-slate-100 text-slate-600 dark:bg-[#171514] dark:text-secondary group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}
                                  >
                                    <CalendarIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-hornbill text-sm sm:text-base font-bold text-foreground tracking-tight">
                                      {slot.departureDate}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                          isSlotSoldOut
                                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                            : isLowAvailability
                                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            isSlotSoldOut ? 'bg-red-500' : isLowAvailability ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'
                                          }`}
                                        />
                                        {slot.availableSeats === 1
                                          ? dict.get(locale, 'experience.seatLeftSingle')
                                          : dict
                                              .get(locale, 'experience.seatsLeft')
                                              .replace('{count}', String(slot.availableSeats))}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-primary dark:bg-secondary text-white shadow-xs ring-2 ring-primary/20 dark:ring-secondary/30'
                                      : 'border-2 border-slate-300 dark:border-secondary/30 group-hover:border-primary/50 dark:group-hover:border-secondary/60'
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Selected Departure Summary Card */}
                      {selectedSlot && (() => {
                        const isSlotSoldOut = selectedSlot.availableSeats === 0
                        const isSlotLimited = !isSlotSoldOut && selectedSlot.availableSeats <= 4
                        const formattedSlotTime = selectedSlot.startTime ? formatTimeTo12Hour(selectedSlot.startTime) : null
                        const formattedSlotDate = formatHumanDateCompact(selectedSlot.departureDate, locale)
                        const hasSlotValidRatio =
                          typeof selectedSlot.totalCapacity === 'number' &&
                          selectedSlot.totalCapacity > 0 &&
                          selectedSlot.availableSeats >= 0 &&
                          selectedSlot.availableSeats <= selectedSlot.totalCapacity
                        const slotCapacityPct = hasSlotValidRatio && selectedSlot.totalCapacity
                          ? Math.min(100, Math.max(0, Math.round((selectedSlot.availableSeats / selectedSlot.totalCapacity) * 100)))
                          : null
                        const hasRoutePreview = Array.isArray(data.destinations) && data.destinations.length >= 2

                        return (
                          <div className="mt-2 p-4 sm:p-5 rounded-2xl bg-[#faf8f5] dark:bg-[#1a1817] border border-slate-200 dark:border-secondary/30 flex flex-col gap-3.5 shadow-sm transition-all duration-300">
                            {/* Card Header: Label & Live Availability Status Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-accent/15 dark:bg-accent/20 text-accent flex items-center justify-center shrink-0">
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-[#1a1e4e] dark:text-secondary">
                                  {dict.get(locale, 'experience.selectedDeparture') || 'Selected Departure'}
                                </span>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  isSlotSoldOut
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                    : isSlotLimited
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSlotSoldOut ? 'bg-red-500' : isSlotLimited ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'
                                  }`}
                                />
                                {isSlotSoldOut
                                  ? dict.get(locale, 'experience.soldOut') || 'Sold Out'
                                  : isSlotLimited
                                    ? dict.get(locale, 'experience.seatsLeft').replace('{count}', String(selectedSlot.availableSeats))
                                    : (dict.get(locale, 'experience.seatsAvailable') || '{count} seats available').replace(
                                        '{count}',
                                        String(selectedSlot.availableSeats),
                                      )}
                              </span>
                            </div>

                            {/* Focal Departure Date & Time */}
                            <div className="flex flex-col gap-0.5">
                              <span className="font-hornbill text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                                {formattedSlotDate || selectedSlot.departureDate}
                              </span>
                              {formattedSlotTime && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                  <ClockIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span className="font-semibold text-foreground">{formattedSlotTime}</span>
                                  {data.destinationTimezone && (
                                    <span className="text-muted-foreground font-normal">
                                      · {data.destinationTimezone} ({dict.get(locale, 'experience.localTime') || 'Local time'})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Visual Capacity Mini Dots / Progress (SSOT & Content Resilience) */}
                            {hasSlotValidRatio && selectedSlot.totalCapacity && (
                              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200/60 dark:border-secondary/15">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>
                                    {(dict.get(locale, 'experience.capacityProgress') || '{available} of {total} seats available')
                                      .replace('{available}', String(selectedSlot.availableSeats))
                                      .replace('{total}', String(selectedSlot.totalCapacity))}
                                  </span>
                                  {slotCapacityPct !== null && (
                                    <span className="font-semibold text-foreground">{slotCapacityPct}%</span>
                                  )}
                                </div>
                                {selectedSlot.totalCapacity <= 16 ? (
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: selectedSlot.totalCapacity }).map((_, idx) => {
                                      const isDotAvailable = idx < selectedSlot.availableSeats
                                      const isDotOnHold =
                                        !isDotAvailable &&
                                        typeof selectedSlot.heldSeats === 'number' &&
                                        selectedSlot.heldSeats > 0 &&
                                        idx < selectedSlot.availableSeats + selectedSlot.heldSeats

                                      return (
                                        <span
                                          key={idx}
                                          className={`h-2 flex-1 rounded-xs transition-colors ${
                                            isDotAvailable
                                              ? 'bg-amber-500 dark:bg-amber-600'
                                              : isDotOnHold
                                                ? 'bg-sky-500'
                                                : 'bg-red-500/70 dark:bg-red-500/80'
                                          }`}
                                        />
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-card overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        selectedSlot.availableSeats === 0
                                          ? 'bg-red-500'
                                          : 'bg-amber-500'
                                      } rounded-full transition-all duration-300`}
                                      style={{ width: `${slotCapacityPct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Optional Route Preview (Rendered ONLY when valid) */}
                            {hasRoutePreview && data.destinations && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1 border-t border-slate-200/60 dark:border-secondary/15">
                                <span className="font-semibold text-foreground">{data.destinations[0].name}</span>
                                <span className="text-accent rtl:rotate-180">──►</span>
                                <span className="font-semibold text-foreground">
                                  {data.destinations[data.destinations.length - 1].name}
                                </span>
                              </div>
                            )}

                            {/* Luxury Dossier Action Trigger */}
                            <button
                              type="button"
                              onClick={() => setIsDetailsDrawerOpen(true)}
                              className="w-full mt-1 py-2 px-3.5 rounded-xl bg-primary/8 dark:bg-secondary/15 hover:bg-primary/15 dark:hover:bg-secondary/25 active:scale-[0.99] text-primary dark:text-secondary font-bold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <span>{dict.get(locale, 'experience.exploreDepartureDetails') || 'Explore departure details'}</span>
                              <svg className="w-4 h-4 rtl:rotate-180 shrink-0 text-primary dark:text-secondary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </button>
                          </div>
                        )
                      })()}
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
                        className="w-full p-4 rounded-2xl border border-gray-200 dark:border-secondary/25 bg-gray-50/80 dark:bg-card/60 text-base font-semibold focus:outline-none focus:border-primary dark:focus:border-secondary focus:ring-2 focus:ring-primary/25 dark:focus:ring-secondary/30 transition-all text-foreground shadow-sm"
                      />
                      {isSelectedDateBlackedOut && (
                        <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <AlertIcon className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                          <span>{dict.get(locale, 'experience.blackoutDateNotice')}</span>
                        </p>
                      )}
                      {selectedDate && calculatedEndDate && (
                        <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-card/60 border border-gray-200 dark:border-secondary/25 text-xs flex flex-col gap-2 shadow-sm">
                          <div className="flex items-center justify-between font-medium text-muted-foreground">
                            <span>{dict.get(locale, 'experience.tripDuration')}</span>
                            <span className="text-foreground font-semibold text-sm">
                              {data.formattedDuration}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-semibold text-primary dark:text-secondary text-sm">
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
                        className="w-full p-4 rounded-2xl border border-gray-200 dark:border-secondary/25 bg-gray-50/80 dark:bg-card/60 text-base font-semibold focus:outline-none focus:border-primary dark:focus:border-secondary focus:ring-2 focus:ring-primary/25 dark:focus:ring-secondary/30 transition-all text-foreground shadow-sm"
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
                                    ? 'opacity-40 border-gray-200 dark:border-secondary/10 bg-gray-50 dark:bg-card/20 cursor-not-allowed text-muted-foreground'
                                    : isSelected
                                      ? 'border-primary dark:border-secondary ring-2 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/20 text-foreground shadow-md'
                                      : 'border-gray-200 dark:border-secondary/25 hover:border-primary/40 dark:hover:border-secondary/50 bg-gray-50/80 dark:bg-card/60 hover:bg-primary/5 dark:hover:bg-secondary/5 text-foreground shadow-sm'
                                }`}
                              >
                                <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                  <ClockIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-gray-400'} dark:text-secondary`} />
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
                <div className="relative z-10 p-6 sm:p-7 flex flex-col gap-4 border-t-2 border-primary/10 dark:border-secondary/15 bg-[#f8f9fc] dark:bg-transparent transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-primary dark:bg-secondary flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      </span>
                      <span className="text-sm font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wide">
                        {dict.get(locale, 'experience.whoIsTravelling')}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white dark:text-foreground bg-primary/80 dark:bg-transparent px-3 py-1 rounded-full">
                      {adults} {adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')}
                      {childrenCount > 0
                        ? ` · ${childrenCount} ${childrenCount === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}`
                        : ''}
                    </span>
                  </div>

                  {/* Adults Stepper Card */}
                  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-card/60 border border-gray-200 dark:border-secondary/20 hover:shadow-md shadow-sm transition-all">
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
                        className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-95"
                        aria-label={dict.get(locale, 'experience.aria.decreaseAdults')}
                      >
                        −
                      </button>
                      <span className="font-hornbill text-lg font-bold w-6 text-center text-foreground">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdultsChange(1)}
                        className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                        aria-label={dict.get(locale, 'experience.aria.increaseAdults')}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children Stepper Card */}
                  {childrenAllowed && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-card/60 border border-gray-200 dark:border-secondary/20 hover:shadow-md shadow-sm transition-all">
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
                            className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-95"
                            aria-label={dict.get(locale, 'experience.aria.decreaseChildren')}
                          >
                            −
                          </button>
                          <span className="font-hornbill text-lg font-bold w-6 text-center text-foreground">
                            {childrenCount}
                          </span>
                          <button
                            type="button"
                            onClick={onAddChild}
                            className="w-9 h-9 rounded-xl bg-primary dark:bg-transparent border-0 dark:border dark:border-secondary/30 flex items-center justify-center font-bold text-base text-white dark:text-secondary hover:bg-primary-dark dark:hover:bg-secondary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
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
                                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/60 flex flex-col gap-3 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase text-[#1a1e4e] dark:text-secondary">
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
                                      className="p-1.5 rounded-lg border border-gray-200 dark:border-secondary/30 bg-white dark:bg-[#171514] text-xs font-semibold text-foreground focus:outline-none focus:border-primary dark:focus:border-secondary"
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
                                  <div className="text-xs font-medium text-[#1a1e4e] dark:text-secondary bg-primary/8 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/20 p-2.5 rounded-xl">
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
                                        className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                          currentMode === 'sharing_bed'
                                            ? 'border-primary dark:border-secondary ring-1 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/10 text-foreground shadow-sm'
                                            : 'border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/40 hover:border-primary/30 dark:hover:border-secondary/40 text-foreground'
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
                                        className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                          currentMode === 'extra_bed'
                                            ? 'border-primary dark:border-secondary ring-1 ring-primary/30 dark:ring-secondary/40 bg-primary/8 dark:bg-secondary/10 text-foreground shadow-sm'
                                            : 'border-gray-200 dark:border-secondary/20 bg-white dark:bg-card/40 hover:border-primary/30 dark:hover:border-secondary/40 text-foreground'
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

                {/* 3. YOUR ACCOMMODATIONS (Compact Mirror & Selection Trigger) */}
                {isPackage && accommodations.length > 0 && (
                  <div className="relative z-10 p-6 sm:p-7 flex flex-col gap-4 border-t-2 border-primary/10 dark:border-secondary/15 bg-white dark:bg-transparent transition-colors duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-primary dark:bg-secondary flex items-center justify-center">
                          <BuildingIcon className="w-3.5 h-3.5 text-white" />
                        </span>
                        <span className="text-sm font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wide">
                          {dict.get(locale, 'experience.sanctuariesAndStays') || (locale === 'ar' ? 'إقامات الرحلة' : 'Accommodations')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {accommodations.map((stay) => {
                        const options = Array.isArray(stay.options) ? stay.options : []
                        const selectedOptionId =
                          selectedAccommodationOptions[stay.order] ||
                          (options.length === 1 ? options[0]?.id : undefined)
                        const selectedOpt =
                          options.find((opt) => opt.id === selectedOptionId) ||
                          (options.length === 1 ? options[0] : null)
                        const isMultiOption = options.length > 1
                        const nightUnit =
                          stay.nights === 1
                            ? dict.get(locale, 'experience.nightSingular') || (locale === 'ar' ? 'ليلة' : 'night')
                            : dict.get(locale, 'experience.nightPlural') || (locale === 'ar' ? 'ليالٍ' : 'nights')

                        const boardKey = selectedOpt?.boardBasis ? `experience.boardBasis.${selectedOpt.boardBasis}` : ''
                        const boardLabel = boardKey ? dict.get(locale, boardKey) || selectedOpt?.boardBasis : ''

                        return (
                          <div
                            key={stay.order}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-card/50 border border-slate-200/80 dark:border-secondary/20 flex flex-col gap-2 transition-all shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wider">
                                {accommodations.length > 1
                                  ? `${locale === 'ar' ? 'إقامة' : 'Stay'} #${stay.order}`
                                  : (dict.get(locale, 'experience.selectedAccommodation') || (locale === 'ar' ? 'الفندق المختار' : 'Accommodation'))}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {stay.nights} {nightUnit}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-hornbill text-sm sm:text-base font-bold text-foreground truncate">
                                    {selectedOpt?.propertyName || (locale === 'ar' ? 'غير محدد' : 'Not selected')}
                                  </span>
                                  {selectedOpt?.rating && selectedOpt.rating > 0 ? (
                                    <span className="text-xs font-bold text-amber-500 shrink-0">
                                      {'★'.repeat(Math.min(selectedOpt.rating, 5))}
                                    </span>
                                  ) : null}
                                </div>
                                {(selectedOpt?.roomCategory || boardLabel) && (
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                                    {selectedOpt?.roomCategory && (
                                      <span>{selectedOpt.roomCategory}</span>
                                    )}
                                    {selectedOpt?.roomCategory && boardLabel && <span>·</span>}
                                    {boardLabel && <span>{boardLabel}</span>}
                                  </div>
                                )}
                              </div>

                              {isMultiOption && onSelectAccommodationOption && (
                                <button
                                  type="button"
                                  onClick={() => setActiveAccommodationModalStayOrder(stay.order)}
                                  className="px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-secondary/15 hover:bg-primary/20 dark:hover:bg-secondary/25 active:scale-[0.98] text-primary dark:text-secondary text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                  </svg>
                                  <span>{dict.get(locale, 'experience.changeArrangement') || (locale === 'ar' ? 'تعديل' : 'Change')}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 4. YOUR ROOMS */}
                {isPackage && (
                  <div className="relative z-10 p-6 sm:p-7 flex flex-col gap-4 border-t-2 border-primary/10 dark:border-secondary/15 bg-white dark:bg-transparent transition-colors duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-primary dark:bg-secondary flex items-center justify-center">
                          <BedIcon className="w-3.5 h-3.5 text-white" />
                        </span>
                        <span className="text-sm font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wide">
                          {dict.get(locale, 'experience.yourRooms')}
                        </span>
                      </div>
                      {activeRoomCount !== null ? (
                        <span className="text-xs font-bold text-white dark:text-foreground bg-primary/80 dark:bg-transparent px-3 py-1 rounded-full">
                          {activeRoomCount} {roomUnit} · {totalGuests} {guestUnit}
                        </span>
                      ) : loadingPrice ? (
                        <span className="text-xs font-medium text-muted-foreground animate-pulse">
                          {locale === 'ar' ? 'جاري التحميل...' : 'Calculating...'}
                        </span>
                      ) : null}
                    </div>

                    {/* Room Arrangement Summary Card (Compact Two-Tier Trigger) */}
                    {activeOption && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card/50 border border-slate-200/80 dark:border-secondary/20 flex flex-col gap-2.5 transition-all shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1a1e4e] dark:text-secondary uppercase tracking-wider">
                            {dict.get(locale, 'experience.roomArrangement') || (locale === 'ar' ? 'توزيع الغرف' : 'Room Arrangement')}
                          </span>
                          {activeOption.isRecommended && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {dict.get(locale, 'experience.recommended') || (locale === 'ar' ? 'موصى به' : 'Recommended')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-hornbill text-sm sm:text-base font-bold text-foreground truncate">
                              {formatOptionLabel(activeOption, locale)}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {activeRoomCount} {roomUnit} · {totalGuests} {guestUnit}
                            </span>
                          </div>

                          {availableOptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setIsArrangementModalOpen(true)}
                              className="px-3.5 py-2 rounded-xl bg-primary/10 dark:bg-secondary/15 hover:bg-primary/20 dark:hover:bg-secondary/25 active:scale-[0.98] text-primary dark:text-secondary text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              <span>{dict.get(locale, 'experience.changeArrangement') || (locale === 'ar' ? 'تعديل' : 'Change')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Room Breakdown Projection - Hidden by default, displayed on demand via accordion */}
                    {activeAllocation && activeAllocation.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRoomsAccordionOpen((prev) => !prev)}
                          className="flex items-center justify-between text-xs font-bold text-primary dark:text-secondary hover:underline cursor-pointer py-1"
                        >
                          <span>
                            {isRoomsAccordionOpen
                              ? dict.get(locale, 'experience.hideRoomDetails') || (locale === 'ar' ? 'إخفاء تفاصيل الغرف' : 'Hide room details')
                              : `${dict.get(locale, 'experience.viewRoomDetails') || (locale === 'ar' ? 'عرض تفاصيل الغرف' : 'View room details')} (${activeAllocation.length})`}
                          </span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isRoomsAccordionOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>

                        {isRoomsAccordionOpen && (
                          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 animate-in fade-in duration-150 ${loadingPrice ? 'opacity-70 transition-opacity' : ''}`}>
                            {activeAllocation.map((rm) => {
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
                                  className="p-3 rounded-xl bg-white dark:bg-card/60 border border-slate-200/80 dark:border-secondary/20 hover:shadow-md shadow-xs flex flex-col gap-1 transition-all"
                                >
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#1a1e4e] dark:text-secondary uppercase">
                                    <span className="flex items-center gap-1.5">
                                      <BedIcon className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />
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
                  </div>
                )}

                {/* Pricing Error Alert */}
                {pricingError && (
                  <div className="p-4 mx-6 my-2 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-medium flex flex-col gap-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertIcon className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                      <span>{pricingError}</span>
                    </div>
                    <p className="text-[11px] text-red-500/80 dark:text-red-400/80 font-normal">
                      {dict.get(locale, 'experience.pricingErrorHint')}
                    </p>
                  </div>
                )}

                {/* 5. PRICE SUMMARY */}
                {pricingState?.commercialBreakdown && (
                  <div className="relative z-10 p-6 sm:p-7 flex flex-col gap-3 bg-gradient-to-b from-[#f0f2fa] to-[#e8ebf5] dark:bg-[#171514]/50 dark:bg-none border-t-3 border-primary dark:border-t dark:border-accent/15 transition-colors duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-primary/15 dark:border-accent/20">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-primary dark:bg-accent flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                        </span>
                        <span className="text-sm font-bold text-[#1a1e4e] dark:text-accent uppercase tracking-wide">
                          {dict.get(locale, 'experience.priceSummary') || 'Price Summary'}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Rows Container */}
                    <div className="flex flex-col gap-2">
                      {/* Journey Base Price Row */}
                      <div className="p-3 sm:p-3.5 rounded-xl bg-white/90 dark:bg-card/40 border border-slate-200/80 dark:border-secondary/15 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {dict.get(locale, 'experience.journeyPrice') || 'Journey Price'}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                            {adults} {adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')} × {pricingState.formattedBreakdown?.adultBasePrice.formatted || pricingState.unitPrice.formatted}
                          </span>
                        </div>
                        <span className="font-hornbill text-sm sm:text-base font-bold text-foreground shrink-0">
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
                              className="p-3 sm:p-3.5 rounded-xl bg-white/90 dark:bg-card/40 border border-slate-200/80 dark:border-secondary/15 flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-foreground">
                                  {dict.get(locale, 'experience.childIndex').replace('{index}', String(idx + 1))}
                                </span>
                                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                  {ch.age} {ch.age === 1 ? dict.get(locale, 'experience.yearSingular') : dict.get(locale, 'experience.yearPlural')} · {ch.category === 'infant' ? dict.get(locale, 'experience.infantCategory') : ch.beddingMode === 'sharing_bed' ? dict.get(locale, 'experience.sharingBed') : dict.get(locale, 'experience.extraBed')}
                                </span>
                              </div>
                              <span className="font-hornbill text-sm sm:text-base font-bold text-foreground shrink-0">
                                {ch.priceEGP === 0
                                  ? dict.get(locale, 'experience.free')
                                  : formattedCh?.price.formatted || ''}
                              </span>
                            </div>
                          )
                        })}

                      {/* Accommodations Group & Transparent Room Breakdown */}
                      {pricingState.commercialBreakdown.accommodationTotalEGP > 0 && (
                        <div className="p-3.5 sm:p-4 rounded-xl bg-white/90 dark:bg-card/40 border border-slate-200/80 dark:border-secondary/15 flex flex-col gap-3 shadow-xs">
                          {/* Main Accommodations Header & Total */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-primary/10 dark:bg-secondary/20 text-primary dark:text-secondary flex items-center justify-center shrink-0">
                                <BedIcon className="w-3.5 h-3.5" />
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-foreground">
                                  {dict.get(locale, 'experience.luxuryAccommodations') || 'Accommodations Price'}
                                </span>
                                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                  {pricingState.formattedBreakdown?.staysBreakdown?.length || 0}{' '}
                                  {locale === 'ar' ? 'إقامات' : 'stays'}{activeRoomCount ? ` · ${activeRoomCount} ${roomUnit}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="font-hornbill text-sm sm:text-base font-bold text-foreground shrink-0">
                              {pricingState.formattedBreakdown?.accommodationTotalPrice?.formatted || ''}
                            </span>
                          </div>

                          {/* Stay-by-Stay & Room-by-Room Transparent Breakdown */}
                          {pricingState.formattedBreakdown?.staysBreakdown && pricingState.formattedBreakdown.staysBreakdown.length > 0 && (
                            <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100 dark:border-secondary/15">
                              {pricingState.formattedBreakdown.staysBreakdown.map((stay) => {
                                const nightUnit = stay.nights === 1 ? dict.get(locale, 'experience.nightSingular') : dict.get(locale, 'experience.nightPlural')
                                return (
                                  <div
                                    key={stay.order}
                                    className="p-3 rounded-lg bg-slate-50/80 dark:bg-[#171514]/60 border border-slate-200/70 dark:border-secondary/15 flex flex-col gap-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-xs text-foreground">
                                          {stay.propertyName}
                                        </span>
                                        {stay.roomCategory && (
                                          <span className="text-[10px] text-muted-foreground">
                                            {stay.roomCategory}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-hornbill text-xs font-semibold text-foreground shrink-0">
                                        {stay.stayAccommodationTotalPrice.formatted}
                                      </span>
                                    </div>

                                    {stay.appliedRoomRates && stay.appliedRoomRates.length > 0 && (
                                      <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200/50 dark:border-secondary/10">
                                        {stay.appliedRoomRates.map((r, rIdx) => {
                                          const occKey = `experience.occupancy.${r.occupancy}Room`
                                          const occLabel = dict.get(locale, occKey) || `${r.occupancy.charAt(0).toUpperCase() + r.occupancy.slice(1)} Room`
                                          const rateMultiplierText =
                                            r.pricingUnit === 'per_night'
                                              ? `${r.nights} ${nightUnit} × ${r.unitRatePrice.formatted}`
                                              : `${dict.get(locale, 'experience.perStayShort') || '/ stay'} × ${r.unitRatePrice.formatted}`

                                          return (
                                            <div
                                              key={rIdx}
                                              className="flex items-center justify-between text-[11px] text-muted-foreground pl-2.5 rtl:pl-0 rtl:pr-2.5 border-l-2 rtl:border-l-0 rtl:border-r-2 border-primary/30 dark:border-secondary/40"
                                            >
                                              <span className="font-medium">
                                                {dict.get(locale, 'experience.roomIndex').replace('{index}', String(r.roomIndex))} ({occLabel}) · {rateMultiplierText}
                                              </span>
                                              <span className="font-semibold text-foreground">
                                                {r.totalRoomCostPrice.formatted}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Total Trip Price Divider & Row */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#171514] border-2 border-primary/20 dark:border-accent/30 shadow-sm flex items-baseline justify-between gap-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm uppercase font-bold text-[#1a1e4e] dark:text-accent tracking-wider">
                          {dict.get(locale, 'experience.totalTripPrice') || 'Total Trip Price'}
                        </span>
                      </div>
                      <div
                        className={
                          loadingPrice
                            ? 'opacity-50 transition-opacity duration-200 shrink-0'
                            : 'transition-opacity duration-200 shrink-0'
                        }
                      >
                        {displayPrice ? (
                          <CurrencyDisplay
                            price={displayPrice}
                            size="lg"
                            className="font-hornbill font-bold text-2xl sm:text-3xl text-foreground"
                          />
                        ) : (
                          <span className="text-xl font-hornbill text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. PRIMARY ACTION */}
                <div className="relative z-10 p-6 sm:p-7 bg-gradient-to-b from-[#e8ebf5] to-[#dfe3f0] dark:bg-[#171514] dark:bg-none pt-0 transition-colors duration-300">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full font-semibold shadow-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-base shadow-accent/30 cursor-pointer"
                    disabled={!canBook || loadingPrice}
                    onClick={onProceedToCheckout}
                  >
                    {loadingPrice ? (
                      <span>{dict.get(locale, 'experience.updatingCalculation')}</span>
                    ) : displayPrice ? (
                      <span className="flex items-center justify-center gap-2">
                        <span>
                          {displayPrice.formatted} · {dict.get(locale, 'experience.bookThisJourney')}
                        </span>
                        <svg
                          className="w-4 h-4 rtl:rotate-180 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
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
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-r from-[#1a1e4e]/95 via-[#252a6b]/95 to-[#2e3192]/95 dark:bg-[#171514]/95 dark:bg-none text-white backdrop-blur-md border-t border-accent/30 lg:hidden flex items-center justify-between gap-4 shadow-2xl transition-colors duration-300">
        <div>
          <span className="text-[10px] uppercase text-[#F58220] dark:text-accent font-bold block">
            {dict.get(locale, 'experience.totalTripPrice') || 'Total Trip Price'}
          </span>
          {displayPrice ? (
            <CurrencyDisplay
              price={displayPrice}
              size="md"
              className="font-hornbill font-bold text-white text-lg"
            />
          ) : (
            <span className="text-base font-bold text-slate-300 dark:text-muted-foreground">—</span>
          )}
        </div>
        <Button
          variant="accent"
          size="md"
          className="font-bold shadow-lg shadow-accent/20 flex-1 max-w-[220px] active:scale-[0.98] transition-all text-sm cursor-pointer"
          disabled={!canBook || loadingPrice}
          onClick={onProceedToCheckout}
        >
          {loadingPrice
            ? dict.get(locale, 'experience.updatingCalculation')
            : dict.get(locale, 'experience.bookJourneyShort')}
        </Button>
      </div>

      {/* 6. ROOM ARRANGEMENT MODAL (Two-Tier Custom Distribution Dialog) */}
      <RoomArrangementModal
        isOpen={isArrangementModalOpen}
        onClose={() => setIsArrangementModalOpen(false)}
        totalGuests={totalGuests}
        adultsCount={adults}
        childrenCount={childrenCount}
        supportedOccupancies={supportedOccupancies}
        availableOptions={availableOptions}
        activeOptionId={activeOptionId}
        onApplyAllocation={onApplyAllocationAsync || (async (id) => { onSelectAllocation?.(id); return true })}
        locale={locale}
      />

      {/* 7. SELECTED DEPARTURE DETAILS DRAWER */}
      {selectedSlot && (
        <DepartureDetailsDrawer
          isOpen={isDetailsDrawerOpen}
          onClose={() => setIsDetailsDrawerOpen(false)}
          departureDate={selectedSlot.departureDate}
          startTime={selectedSlot.startTime}
          destinationTimezone={data.destinationTimezone}
          availableSeats={selectedSlot.availableSeats}
          totalCapacity={selectedSlot.totalCapacity}
          heldSeats={selectedSlot.heldSeats}
          soldSeats={selectedSlot.soldSeats}
          duration={data.formattedDuration}
          experienceType={data.type}
          destinations={data.destinations}
          heroImage={data.images?.[0]}
          price={displayPrice}
          unitPrice={pricingState?.unitPrice ?? null}
          loadingPrice={loadingPrice}
          canBook={canBook}
          locale={locale}
          onProceedToCheckout={onProceedToCheckout}
        />
      )}

      {/* 8. ACCOMMODATION SELECTION MODAL */}
      {modalStay && (
        <AccommodationSelectionModal
          isOpen={activeAccommodationModalStayOrder !== null}
          onClose={() => setActiveAccommodationModalStayOrder(null)}
          stayOrder={modalStay.order}
          destinationName={data.destinations?.[modalStay.order - 1]?.name}
          nights={modalStay.nights}
          options={modalStay.options}
          selectedOptionId={selectedAccommodationOptions[modalStay.order]}
          onSelectOption={(order, optionId) => {
            onSelectAccommodationOption?.(order, optionId)
          }}
          locale={locale}
        />
      )}
    </>
  )
}
