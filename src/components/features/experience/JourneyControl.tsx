'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'motion/react'
import { CurrencyDisplay, Button } from '@/components/ui'
import type {
  ExperienceDetailsDTO,
  ChildPolicyDTO,
  FormattedCommercialBreakdown,
  DepartureSlotDTO,
  AccommodationStayDTO,
} from '@/application/experience/dto-details'
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { RoomAllocationOption, OccupancyType } from '@/domains/experience/room-allocation-policy'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import { RoomArrangementModal } from './RoomArrangementModal'
import { AccommodationSelectionModal } from './AccommodationSelectionModal'
import { DepartureSelectionModal } from './DepartureSelectionModal'
import { TravellersModal } from './TravellersModal'

const dict = new JsonTranslationDictionary()

/* Minimalist geometric stroke-based SVG icons */
function BuildingIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8.25V18m0 0h16.5m-16.5 0v2.25M20.25 18v2.25M3.75 12.75h16.5v5.25H3.75v-5.25zM6.75 9.75h4.5v3H6.75v-3z" />
    </svg>
  )
}

function DoorIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-16.5a1.5 1.5 0 011.5-1.5h6a1.5 1.5 0 011.5 1.5V21m-9 0h10.5m-4.5-9h.008v.008H12.75V12z" />
    </svg>
  )
}

function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ChevronLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function MapPinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function ReceiptIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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

  order.forEach((occ) => {
    const c = counts[occ]
    if (c > 0) {
      const template =
        c === 1
          ? `1 ${dict.get(locale, `experience.occupancy.${occ}Room`)}`
          : dict.get(locale, `experience.occupancy.${occ}RoomsPlural`, { count: String(c) })
      parts.push(template)
    }
  })

  return parts.join(' + ')
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
    return new Intl.DateTimeFormat(locale, {
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

function formatHumanDateDetailed(dateStr: string, locale: string): { formatted: string; weekday: string } {
  if (!dateStr) return { formatted: '', weekday: '' }
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return { formatted: dateStr, weekday: '' }
    const d = new Date(Date.UTC(year, month - 1, day))
    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
    const weekday = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'long',
    }).format(d)
    return { formatted, weekday }
  } catch {
    return { formatted: dateStr, weekday: '' }
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
  // Ephemeral UI interaction states only (zero business state)
  const [isDepartureModalOpen, setIsDepartureModalOpen] = React.useState(false)
  const [isTravellersModalOpen, setIsTravellersModalOpen] = React.useState(false)
  const [isArrangementModalOpen, setIsArrangementModalOpen] = React.useState(false)
  const [activeAccommodationModalStayOrder, setActiveAccommodationModalStayOrder] = React.useState<number | null>(null)
  const [isCardInView, setIsCardInView] = React.useState(false)
  const composerCardRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const cardEl = composerCardRef.current
    if (!cardEl || typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCardInView(entry.isIntersecting)
      },
      {
        root: null,
        threshold: 0.05,
      }
    )

    observer.observe(cardEl)
    return () => observer.disconnect()
  }, [])

  const handleScrollToComposer = React.useCallback(() => {
    if (composerCardRef.current) {
      composerCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      const el = document.getElementById('journey-composer')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])

  const accommodations = (data as { accommodations?: AccommodationStayDTO[] }).accommodations || []
  const modalStay = accommodations.find((s) => s.order === activeAccommodationModalStayOrder)

  const isRtl = locale === 'ar'
  const [slideDirection, setSlideDirection] = React.useState<number>(1)

  const slideVariants: Variants = React.useMemo(() => ({
    enter: (direction: number) => ({
      x: direction > 0 ? (isRtl ? -28 : 28) : (isRtl ? 28 : -28),
      y: 4,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        y: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        scale: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        opacity: { duration: 0.32, ease: 'easeOut' },
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? (isRtl ? 28 : -28) : (isRtl ? -28 : 28),
      y: -4,
      opacity: 0,
      scale: 0.97,
      transition: {
        x: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        y: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        scale: { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.8 },
        opacity: { duration: 0.22, ease: 'easeIn' },
      },
    }),
  }), [isRtl])

  const availableDepartures: DepartureSlotDTO[] =
    isFixedPackage && 'departureSlots' in data.bookability
      ? (data.bookability.departureSlots as DepartureSlotDTO[]).filter((slot) => slot.status === 'available')
      : []

  const sortedDepartures: DepartureSlotDTO[] = React.useMemo(() => {
    return [...availableDepartures].sort((a, b) => {
      const timeA = new Date(`${a.departureDate}T${a.startTime || '00:00'}:00Z`).getTime()
      const timeB = new Date(`${b.departureDate}T${b.startTime || '00:00'}:00Z`).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.id - b.id
    })
  }, [availableDepartures])

  const selectedSlot = isFixedPackage
    ? sortedDepartures.find((slot) => slot.id === selectedSlotId) || sortedDepartures[0] || null
    : null

  const validIndex = React.useMemo(() => {
    if (!isFixedPackage || sortedDepartures.length === 0) return 0
    const idx = sortedDepartures.findIndex((s) => s.id === (selectedSlot?.id ?? selectedSlotId))
    return idx >= 0 ? idx : 0
  }, [isFixedPackage, sortedDepartures, selectedSlot, selectedSlotId])

  const totalSlots = sortedDepartures.length
  const hasMultipleDepartures = isFixedPackage
    ? totalSlots > 1
    : Boolean(selectedDate)

  const canGoPrev = isFixedPackage
    ? validIndex > 0
    : Boolean(selectedDate && (!minDate || selectedDate > minDate))

  const canGoNext = isFixedPackage
    ? validIndex < totalSlots - 1
    : Boolean(selectedDate)

  const handlePrevDeparture = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isFixedPackage) {
        if (validIndex > 0) {
          setSlideDirection(-1)
          onSelectSlot(sortedDepartures[validIndex - 1].id)
        }
      } else if (selectedDate && canGoPrev) {
        const [y, m, d] = selectedDate.split('-').map(Number)
        const prevD = new Date(Date.UTC(y, m - 1, d - 1))
        const prevStr = prevD.toISOString().split('T')[0]
        setSlideDirection(-1)
        onSelectDate(prevStr)
      }
    },
    [isFixedPackage, validIndex, sortedDepartures, onSelectSlot, selectedDate, canGoPrev, onSelectDate]
  )

  const handleNextDeparture = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isFixedPackage) {
        if (validIndex < sortedDepartures.length - 1) {
          setSlideDirection(1)
          onSelectSlot(sortedDepartures[validIndex + 1].id)
        }
      } else if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number)
        const nextD = new Date(Date.UTC(y, m - 1, d + 1))
        const nextStr = nextD.toISOString().split('T')[0]
        setSlideDirection(1)
        onSelectDate(nextStr)
      }
    },
    [isFixedPackage, validIndex, sortedDepartures, onSelectSlot, selectedDate, onSelectDate]
  )

  const totalGuests = adults + childrenCount
  const guestUnit = totalGuests === 1
    ? (dict.get(locale, 'experience.guestSingular') || 'Guest')
    : (dict.get(locale, 'experience.guestPlural') || 'Guests')

  const adultsLabel = adults === 1
    ? (dict.get(locale, 'experience.adultSingular') || 'Adult')
    : (dict.get(locale, 'experience.adultPlural') || 'Adults')

  const childrenLabel = childrenCount === 1
    ? (dict.get(locale, 'experience.childSingular') || 'Child')
    : (dict.get(locale, 'experience.childPlural') || 'Children')

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

  // Computed summary and detailed strings for authoritative presentation
  const departureDateString = isFixedPackage && selectedSlot
    ? selectedSlot.departureDate
    : selectedDate

  const departureDetailedDate = departureDateString
    ? formatHumanDateDetailed(departureDateString, locale)
    : null

  const departureTimeFormatted = isFixedPackage && selectedSlot?.startTime
    ? formatTimeTo12Hour(selectedSlot.startTime)
    : isDailyTour && selectedTime
      ? formatTimeTo12Hour(selectedTime)
      : null

  const departureLocationText = data.location || data.destinations?.[0]?.name || null

  const departureSummaryText = isFixedPackage && selectedSlot
    ? formatHumanDateCompact(selectedSlot.departureDate, locale) || selectedSlot.departureDate
    : !isFixedPackage && selectedDate
      ? formatHumanDateCompact(selectedDate, locale) || selectedDate
      : (dict.get(locale, 'experience.chooseDepartureDate') || 'Select Date')

  const departureSubtext = isFixedPackage && selectedSlot
    ? [
        selectedSlot.startTime ? formatTimeTo12Hour(selectedSlot.startTime) : null,
        data.destinations?.[0]?.name,
      ].filter(Boolean).join(' · ')
    : isFlexiblePackage && calculatedEndDate
      ? `${dict.get(locale, 'experience.returnDate') || 'Return'}: ${formatHumanDateCompact(calculatedEndDate, locale)}`
      : isDailyTour && selectedTime
        ? formatTimeTo12Hour(selectedTime)
        : undefined

  const travellersSummaryText = `${adults} ${adultsLabel}${childrenCount > 0 ? ` · ${childrenCount} ${childrenLabel}` : ''}`

  const roomSummaryText = activeOption
    ? formatOptionLabel(activeOption, locale)
    : activeRoomCount
      ? `${activeRoomCount} ${roomUnit}`
      : (dict.get(locale, 'experience.yourRooms') || 'Rooms')

  const roomSubtext = activeRoomCount ? `${activeRoomCount} ${roomUnit} · ${totalGuests} ${guestUnit}` : undefined

  const calculateYourJourneyLabel = dict.get(locale, 'experience.calculateYourJourney')

  return (
    <>
      {/* RIGHT COLUMN: THE "CALCULATE YOUR JOURNEY" WORKSPACE (5 Columns - Sticky on Desktop) */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          {/* Main Calculation & Configuration Instrument Panel */}
          <div
            ref={composerCardRef}
            id="journey-composer"
            className="relative overflow-hidden rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-[#070b14] text-slate-900 dark:text-white shadow-xl shadow-slate-300/60 dark:shadow-2xl dark:shadow-black/50 transition-colors duration-300 scroll-mt-24"
          >
            {/* Ambient Corner Accent Glow */}
            <div
              className="absolute -top-20 -right-20 rtl:-left-20 rtl:-right-auto w-64 h-64 rounded-full bg-primary/5 dark:bg-primary/15 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 -left-20 rtl:-right-20 rtl:-left-auto w-64 h-64 rounded-full bg-accent/5 dark:bg-accent/10 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            {/* 1. Instrument Header: Commercial Context & Baseline */}
            <div className="relative z-10 p-6 sm:p-7 pb-5 flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800/80">
              {/* Top title line + Duration pill */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-bold tracking-widest text-accent uppercase">
                    {calculateYourJourneyLabel}
                  </span>
                  <span className="h-px w-10 bg-accent/60 shrink-0" />
                </div>

                {data.formattedDuration && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#131a2b] border border-slate-300 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300 shrink-0" />
                    <span>{data.formattedDuration}</span>
                  </div>
                )}
              </div>

              {/* Price row */}
              <div className="flex flex-col mt-1">
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  {dict.get(locale, 'experience.fromPerAdult')}
                </span>
                <div className="mt-1">
                  {pricingState?.unitPrice ? (
                    <CurrencyDisplay
                      price={pricingState.unitPrice}
                      size="lg"
                      className="font-hornbill font-normal text-slate-900 dark:text-white text-3xl sm:text-4xl tracking-tight"
                    />
                  ) : (
                    <span className="text-3xl font-hornbill text-slate-400 dark:text-slate-500">—</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed mt-1.5">
                  {dict.get(locale, 'experience.customizeNotice')}
                </p>
              </div>
            </div>

            {/* Not Bookable State */}
            {!data.bookability.isBookable ? (
              <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-4 bg-slate-50/50 dark:bg-[#070b14]">
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
                  <Button variant="outline" size="lg" className="w-full font-semibold border-secondary/30 hover:bg-secondary/10 text-secondary bg-transparent">
                    {dict.get(locale, 'experience.empty.exploreOther')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* 2. Interactive Configuration Rows (Organized calm inset cards) */}
                <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-3.5">
                  {/* Row 1: Departure Card (Clickable Card Body & Interactive Slider) */}
                  <div
                    onClick={() => setIsDepartureModalOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsDepartureModalOpen(true)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={dict.get(locale, 'experience.departureModal.title')}
                    className="group/dep-card p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 hover:border-primary dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#0e1628] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3.5 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-secondary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#141d30] border border-primary/25 dark:border-slate-700/60 flex items-center justify-center text-primary dark:text-secondary shrink-0 mt-0.5 group-hover/dep-card:scale-110 group-hover/dep-card:rotate-[-4deg] group-hover/dep-card:border-primary/40 dark:group-hover/dep-card:border-secondary/40 transition-all duration-300 shadow-2xs">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                              {dict.get(locale, 'experience.departureModal.title')}
                            </span>
                            {isFixedPackage && totalSlots > 1 && (
                              <motion.span
                                key={validIndex}
                                initial={{ scale: 0.8, y: -2, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                                className="px-1.5 py-0.5 rounded-md bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary text-[10px] font-bold"
                              >
                                {validIndex + 1} / {totalSlots}
                              </motion.span>
                            )}
                          </div>

                          {/* Animated Date & Time Section with Calm Stagger */}
                          <div className="relative overflow-hidden min-h-[52px]">
                            <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
                              <motion.div
                                key={isFixedPackage ? (selectedSlot?.id ?? validIndex) : selectedDate}
                                custom={slideDirection}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="flex flex-col min-w-0"
                              >
                                <motion.span
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className="font-hornbill text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover/dep-card:text-primary dark:group-hover/dep-card:text-secondary transition-colors"
                                >
                                  {departureDetailedDate?.formatted || departureSummaryText}
                                </motion.span>
                                <motion.div
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.06 }}
                                  className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1"
                                >
                                  {departureTimeFormatted && <span>{departureTimeFormatted}</span>}
                                  {departureTimeFormatted && (departureLocationText || data.destinationTimezone) && (
                                    <span>·</span>
                                  )}
                                  {departureLocationText && <span>{departureLocationText}</span>}
                                  {data.destinationTimezone && !departureLocationText && (
                                    <span>{data.destinationTimezone}</span>
                                  )}
                                </motion.div>
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsDepartureModalOpen(true)
                          }}
                          className="group/change inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-secondary group-hover/dep-card:text-primary-dark dark:group-hover/dep-card:text-secondary-light transition-colors cursor-pointer"
                        >
                          <span>{dict.get(locale, 'experience.changeArrangement')}</span>
                          <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover/change:translate-x-0.5 rtl:group-hover/change:-translate-x-0.5 transition-transform duration-200" />
                        </button>

                        <div className="relative overflow-hidden min-h-[24px]">
                          <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
                            {isFixedPackage && selectedSlot && typeof selectedSlot.availableSeats === 'number' && (
                              <motion.span
                                key={selectedSlot.id}
                                initial={{ scale: 0.85, y: 3, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.85, y: -3, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                                className="px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold whitespace-nowrap block shadow-2xs transition-colors"
                              >
                                {dict.get(locale, 'experience.seatsAvailable', { count: String(selectedSlot.availableSeats) })}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Departure Slider Control Strip */}
                    {hasMultipleDepartures && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1"
                      >
                        {/* Previous Button: completely disappears when on the first date! */}
                        <div className="w-20 flex items-center justify-start shrink-0">
                          <AnimatePresence initial={false}>
                            {canGoPrev && (
                              <motion.button
                                type="button"
                                initial={{ opacity: 0, scale: 0.8, x: isRtl ? 8 : -8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: isRtl ? 8 : -8 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePrevDeparture}
                                aria-label={dict.get(locale, 'experience.previousDeparture')}
                                className="group/prev-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141d30] text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-secondary border border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-secondary/50 hover:bg-primary/5 dark:hover:bg-secondary/10 shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap transition-all duration-200"
                              >
                                <ChevronLeftIcon className="w-3.5 h-3.5 rtl:rotate-180 transition-transform duration-200 group-hover/prev-btn:-translate-x-0.5 rtl:group-hover/prev-btn:translate-x-0.5" />
                                <span className="text-[11px] font-medium">{dict.get(locale, 'experience.prevShort')}</span>
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Center Pagination Indicator */}
                        <div className="flex-1 flex items-center justify-center min-w-0">
                          {isFixedPackage ? (
                            totalSlots <= 5 ? (
                              <div className="flex items-center gap-1.5 py-1">
                                {sortedDepartures.map((slot, idx) => {
                                  const isActive = idx === validIndex
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (idx !== validIndex) {
                                          setSlideDirection(idx > validIndex ? 1 : -1)
                                          onSelectSlot(slot.id)
                                        }
                                      }}
                                      aria-label={`Slot ${idx + 1}`}
                                      className="relative w-5 h-2.5 rounded-full cursor-pointer flex items-center justify-center group/dot transition-transform hover:scale-125"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/dot:bg-primary/60 dark:group-hover/dot:bg-secondary/60 transition-colors" />
                                      {isActive && (
                                        <motion.span
                                          layoutId="active-departure-pill"
                                          className="absolute inset-0 rounded-full bg-primary dark:bg-secondary shadow-xs shadow-primary/30 dark:shadow-secondary/30"
                                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                        />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/60 hover:border-primary/30 dark:hover:border-secondary/30 transition-colors shadow-2xs">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  {validIndex + 1} <span className="text-slate-400 font-normal">/</span> {totalSlots}
                                </span>
                                <div className="w-12 h-1.5 rounded-full bg-slate-300/80 dark:bg-slate-700 overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-primary to-accent dark:from-secondary dark:to-accent rounded-full"
                                    initial={false}
                                    animate={{ width: `${((validIndex + 1) / totalSlots) * 100}%` }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                                  />
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {departureDetailedDate?.weekday || ''}
                            </span>
                          )}
                        </div>

                        {/* Next Button: completely disappears when on the last date! */}
                        <div className="w-20 flex items-center justify-end shrink-0">
                          <AnimatePresence initial={false}>
                            {canGoNext && (
                              <motion.button
                                type="button"
                                initial={{ opacity: 0, scale: 0.8, x: isRtl ? -8 : 8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: isRtl ? -8 : 8 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleNextDeparture}
                                aria-label={dict.get(locale, 'experience.nextDeparture')}
                                className="group/next-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141d30] text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-secondary border border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-secondary/50 hover:bg-primary/5 dark:hover:bg-secondary/10 shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap transition-all duration-200"
                              >
                                <span className="text-[11px] font-medium">{dict.get(locale, 'experience.nextShort')}</span>
                                <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180 transition-transform duration-200 group-hover/next-btn:translate-x-0.5 rtl:group-hover/next-btn:-translate-x-0.5" />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Capacity & Matrix Strip */}
                    {isFixedPackage && selectedSlot && (
                      <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800/80 overflow-hidden">
                        <div className="flex flex-col gap-2.5">
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center justify-between">
                            <motion.span
                              key={`avail-${selectedSlot.id}`}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                            >
                              {selectedSlot.totalCapacity
                                ? (dict.get(locale, 'experience.capacityProgress') || '{available} of {total} seats available')
                                    .replace('{available}', String(selectedSlot.availableSeats))
                                    .replace('{total}', String(selectedSlot.totalCapacity))
                                : (dict.get(locale, 'experience.seatsAvailable') || '{count} seats available')
                                    .replace('{count}', String(selectedSlot.availableSeats))}
                            </motion.span>
                            {selectedSlot.totalCapacity && (
                              <motion.span
                                key={`pct-${selectedSlot.id}`}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                                className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]"
                              >
                                {Math.round((selectedSlot.availableSeats / selectedSlot.totalCapacity) * 100)}%
                              </motion.span>
                            )}
                          </div>

                          {/* Capsule Strip with Directional Piano Key Cascade */}
                          {selectedSlot.totalCapacity && selectedSlot.totalCapacity <= 24 && (
                            <div
                              className="grid gap-1.5 py-0.5"
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(selectedSlot.totalCapacity, 12)}, minmax(0, 1fr))`,
                              }}
                              role="img"
                              aria-label={`${selectedSlot.availableSeats} of ${selectedSlot.totalCapacity} seats available`}
                            >
                              {Array.from({ length: selectedSlot.totalCapacity }).map((_, idx) => {
                                const isSeatAvailable = idx < selectedSlot.availableSeats
                                const isSeatOnHold =
                                  !isSeatAvailable &&
                                  typeof selectedSlot.heldSeats === 'number' &&
                                  selectedSlot.heldSeats > 0 &&
                                  idx < selectedSlot.availableSeats + selectedSlot.heldSeats

                                const totalCaps = selectedSlot.totalCapacity || 12
                                // Directional Piano Key Cascade Delay:
                                const pianoDelay = slideDirection > 0
                                  ? (isRtl ? (totalCaps - 1 - idx) * 0.038 : idx * 0.038)
                                  : (isRtl ? idx * 0.038 : (totalCaps - 1 - idx) * 0.038)

                                return (
                                  <motion.div
                                    key={`${selectedSlot.id}-${idx}`}
                                    initial={{ y: 7, scale: 0.55, opacity: 0.25 }}
                                    animate={{ y: 0, scale: 1, opacity: 1 }}
                                    transition={{
                                      type: 'spring',
                                      stiffness: 260,
                                      damping: 20,
                                      mass: 0.7,
                                      delay: pianoDelay,
                                    }}
                                    whileHover={{ scale: 1.25, y: -2 }}
                                    title={
                                      isSeatAvailable
                                        ? (dict.get(locale, 'experience.legendAvailable') || 'Available')
                                        : isSeatOnHold
                                          ? (dict.get(locale, 'experience.legendOnHold') || 'On hold')
                                          : (dict.get(locale, 'experience.legendBooked') || 'Booked')
                                    }
                                    className={`h-2.5 sm:h-3 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer ${
                                      isSeatAvailable
                                        ? 'bg-amber-400 shadow-xs shadow-amber-400/40'
                                        : isSeatOnHold
                                          ? 'bg-sky-400 shadow-xs shadow-sky-400/40'
                                          : 'bg-red-500/20 border border-red-500/40'
                                    }`}
                                  />
                                )
                              })}
                            </div>
                          )}

                          {/* Legend */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>{dict.get(locale, 'experience.legendAvailable')}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              <span>{dict.get(locale, 'experience.legendOnHold')}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span>{dict.get(locale, 'experience.legendBooked')}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Flexible / Daily tour notices if applicable */}
                    {isFlexiblePackage && calculatedEndDate && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          {dict.get(locale, 'experience.returnDate') || 'Return'}: <strong className="text-slate-900 dark:text-white">{formatHumanDateCompact(calculatedEndDate, locale)}</strong>
                        </span>
                        {data.formattedDuration && (
                          <span>{dict.get(locale, 'experience.tripDuration')}: <strong className="text-slate-900 dark:text-white">{data.formattedDuration}</strong></span>
                        )}
                      </div>
                    )}
                    {isDailyTour && data.formattedDuration && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>{dict.get(locale, 'experience.tripDuration')}: <strong className="text-slate-900 dark:text-white">{data.formattedDuration}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Travellers Card (Clickable Card Body) */}
                  <div
                    onClick={() => setIsTravellersModalOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsTravellersModalOpen(true)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={dict.get(locale, 'experience.whoIsTravelling')}
                    className="group/trav-card p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 hover:border-primary dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#0e1628] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3.5 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-secondary"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#141d30] border border-primary/25 dark:border-slate-700/60 flex items-center justify-center text-primary dark:text-secondary shrink-0 group-hover/trav-card:scale-105 group-hover/trav-card:border-primary/40 dark:group-hover/trav-card:border-secondary/40 transition-transform shadow-2xs">
                        <UsersIcon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                          {dict.get(locale, 'experience.whoIsTravelling')}
                        </span>
                        <span className="font-hornbill text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover/trav-card:text-primary dark:group-hover/trav-card:text-secondary transition-colors">
                          {travellersSummaryText}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {totalGuests} {guestUnit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsTravellersModalOpen(true)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-secondary group-hover/trav-card:text-primary-dark dark:group-hover/trav-card:text-secondary-light transition-colors cursor-pointer shrink-0"
                    >
                      <span>{dict.get(locale, 'experience.changeArrangement')}</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover/trav-card:translate-x-0.5 rtl:group-hover/trav-card:-translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Row 3: Stays & Accommodations Card(s) */}
                  {isPackage && accommodations.length > 0 && (
                    <div className="flex flex-col gap-3">
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
                            ? dict.get(locale, 'experience.nightSingular')
                            : dict.get(locale, 'experience.nightPlural')

                        const boardKey = selectedOpt?.boardBasis ? `experience.boardBasis.${selectedOpt.boardBasis}` : ''
                        const boardLabel = boardKey ? dict.get(locale, boardKey) || selectedOpt?.boardBasis : ''

                        const ratingCount = selectedOpt?.rating ? Math.min(Math.max(selectedOpt.rating, 1), 5) : 5

                        return (
                          <div
                            key={stay.order}
                            onClick={() => {
                              if (isMultiOption) {
                                setActiveAccommodationModalStayOrder(stay.order)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (isMultiOption && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                setActiveAccommodationModalStayOrder(stay.order)
                              }
                            }}
                            role={isMultiOption ? 'button' : undefined}
                            tabIndex={isMultiOption ? 0 : undefined}
                            className={`p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 hover:border-primary dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#0e1628] shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${
                              isMultiOption ? 'cursor-pointer select-none group/stay-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-secondary' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#141d30] border border-primary/25 dark:border-slate-700/60 flex items-center justify-center text-primary dark:text-secondary shrink-0 shadow-2xs">
                                  <BedIcon className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                                  {accommodations.length > 1
                                    ? dict.get(locale, 'experience.staysCountProgress', { current: String(stay.order), total: String(accommodations.length) })
                                    : dict.get(locale, 'experience.staysCount', { count: String(accommodations.length) })}
                                </span>
                              </div>

                              {isMultiOption && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveAccommodationModalStayOrder(stay.order)
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-secondary group-hover/stay-card:text-primary-dark dark:group-hover/stay-card:text-secondary-light transition-colors cursor-pointer shrink-0"
                                >
                                  <span>{dict.get(locale, 'experience.changeArrangement')}</span>
                                  <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover/stay-card:translate-x-0.5 rtl:group-hover/stay-card:-translate-x-0.5 transition-transform" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-3.5 pl-1 rtl:pl-0 rtl:pr-1 min-w-0">
                              {selectedOpt?.heroUrl ? (
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700/60 shrink-0 bg-slate-100 dark:bg-[#141d30] shadow-2xs">
                                  <Image
                                    src={selectedOpt.heroUrl}
                                    alt={selectedOpt.propertyName}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                </div>
                              ) : null}
                              <div className="flex flex-col min-w-0">
                                <span className="font-hornbill text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                  {selectedOpt?.propertyName || dict.get(locale, 'experience.selectedHotel')}
                                </span>
                                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs mt-0.5">
                                  {'★'.repeat(ratingCount)}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {stay.nights} {nightUnit}
                                  {boardLabel ? ` · ${boardLabel}` : ''}
                                  {selectedOpt?.roomCategory ? ` · ${selectedOpt.roomCategory}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Row 4: Your Rooms Card */}
                  {isPackage && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 hover:border-primary dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#0e1628] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#141d30] border border-primary/25 dark:border-slate-700/60 flex items-center justify-center text-primary dark:text-secondary shrink-0 shadow-2xs">
                          <DoorIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                            {dict.get(locale, 'experience.yourRooms')}
                          </span>
                          <span className="font-hornbill text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-0.5">
                            {roomSummaryText}
                          </span>
                          {roomSubtext && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {roomSubtext}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {availableOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsArrangementModalOpen(true)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-secondary hover:text-primary-dark dark:hover:text-secondary-light transition-colors cursor-pointer"
                          >
                            <span>{dict.get(locale, 'experience.changeArrangement')}</span>
                            <ChevronRightIcon className="w-3.5 h-3.5 rtl:rotate-180" />
                          </button>
                        )}

                        {activeOption?.isRecommended && (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/70 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap">
                            {dict.get(locale, 'experience.recommended')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Error Alert */}
                {pricingError && (
                  <div className="p-4 mx-6 my-2 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium flex flex-col gap-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertIcon className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                      <span>{pricingError}</span>
                    </div>
                    <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-normal">
                      {dict.get(locale, 'experience.pricingErrorHint') || 'Try adjusting your room configuration or selecting another date.'}
                    </p>
                  </div>
                )}

                {/* 3. Authoritative Price Breakdown & Total Surface */}
                <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-3.5 bg-slate-50 dark:bg-[#090e1a] border-t border-slate-300 dark:border-slate-800 transition-colors duration-300">
                  {/* Header: Label & Tax Notice */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-[#141d30] border border-primary/25 dark:border-slate-700/60 text-primary dark:text-secondary flex items-center justify-center shrink-0 shadow-2xs">
                        <ReceiptIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {dict.get(locale, 'experience.priceBreakdown')}
                      </span>
                    </div>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 shrink-0">
                      {dict.get(locale, 'experience.allTaxesIncluded')}
                    </span>
                  </div>

                  {/* Authoritative Breakdown Rows */}
                  {pricingState?.commercialBreakdown && (
                    <div className="flex flex-col gap-2.5">
                      {/* Row 1: Journey Base Price */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {dict.get(locale, 'experience.journeyPrice')}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {adults} {adultsLabel} × {pricingState.formattedBreakdown?.adultBasePrice.formatted || pricingState.unitPrice.formatted}
                          </span>
                        </div>
                        <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white shrink-0">
                          {pricingState.formattedBreakdown?.adultsTotalPrice.formatted || pricingState.totalPrice.formatted}
                        </span>
                      </div>

                      {/* Row 2: Children Breakdown (if any) */}
                      {pricingState.commercialBreakdown.children &&
                        pricingState.commercialBreakdown.children.length > 0 &&
                        pricingState.commercialBreakdown.children.map((ch, idx) => {
                          const formattedCh = pricingState.formattedBreakdown?.children?.[idx]
                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {dict.get(locale, 'experience.childIndex').replace('{index}', String(idx + 1)) || `Child ${idx + 1}`}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                  {ch.age} {ch.age === 1 ? dict.get(locale, 'experience.yearSingular') : dict.get(locale, 'experience.yearPlural')} ·{' '}
                                  {ch.category === 'infant'
                                    ? dict.get(locale, 'experience.infantCategory') || 'Infant'
                                    : ch.beddingMode === 'sharing_bed'
                                      ? dict.get(locale, 'experience.sharingBed') || 'Sharing Bed'
                                      : dict.get(locale, 'experience.extraBed') || 'Extra Bed'}
                                </span>
                              </div>
                              <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white shrink-0">
                                {ch.priceEGP === 0
                                  ? dict.get(locale, 'experience.free') || 'Free'
                                  : formattedCh?.price.formatted || ''}
                              </span>
                            </div>
                          )
                        })}

                      {/* Row 3: Accommodations Price & Stays/Rooms Breakdown */}
                      {pricingState.commercialBreakdown.accommodationTotalEGP > 0 && (
                        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
                          {/* Accommodations Header & Total */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-primary/10 dark:bg-[#141d30] text-primary dark:text-secondary flex items-center justify-center shrink-0 shadow-2xs">
                                <BedIcon className="w-3.5 h-3.5" />
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {dict.get(locale, 'experience.luxuryAccommodations')}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                  {dict.get(locale, 'experience.staysCount', { count: String(pricingState.formattedBreakdown?.staysBreakdown?.length || 0) })}
                                  {activeRoomCount ? ` · ${activeRoomCount} ${roomUnit}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white shrink-0">
                              {pricingState.formattedBreakdown?.accommodationTotalPrice?.formatted || ''}
                            </span>
                          </div>

                          {/* Stay-by-Stay & Room-by-Room Transparent Lines */}
                          {pricingState.formattedBreakdown?.staysBreakdown && pricingState.formattedBreakdown.staysBreakdown.length > 0 && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                              {pricingState.formattedBreakdown.staysBreakdown.map((stay) => {
                                const nightUnit =
                                  stay.nights === 1
                                    ? dict.get(locale, 'experience.nightSingular')
                                    : dict.get(locale, 'experience.nightPlural')

                                return (
                                  <div
                                    key={stay.order}
                                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-slate-800/60 flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                            {stay.propertyName}
                                          </span>
                                          {stay.roomCategory && (
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                              {stay.roomCategory}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-hornbill text-xs font-semibold text-slate-900 dark:text-white shrink-0">
                                        {stay.stayAccommodationTotalPrice.formatted}
                                      </span>
                                    </div>

                                    {stay.appliedRoomRates && stay.appliedRoomRates.length > 0 && (
                                      <div className="flex flex-col gap-1 pt-1 border-t border-slate-200 dark:border-slate-800/40">
                                        {stay.appliedRoomRates.map((r, rIdx) => {
                                          const occKey = `experience.occupancy.${r.occupancy}Room`
                                          const occLabel =
                                            dict.get(locale, occKey) ||
                                            `${r.occupancy.charAt(0).toUpperCase() + r.occupancy.slice(1)} Room`
                                          const rateMultiplierText =
                                            r.pricingUnit === 'per_night'
                                              ? `${r.nights} ${nightUnit} × ${r.unitRatePrice.formatted}`
                                              : `${dict.get(locale, 'experience.perStayShort')} × ${r.unitRatePrice.formatted}`

                                          return (
                                            <div
                                              key={rIdx}
                                              className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-2 rtl:pl-0 rtl:pr-2 border-l-2 rtl:border-l-0 rtl:border-r-2 border-primary/30 dark:border-primary/40"
                                            >
                                              <span className="font-medium">
                                                {dict.get(locale, 'experience.roomIndex').replace('{index}', String(r.roomIndex))} ({occLabel}) · {rateMultiplierText}
                                              </span>
                                              <span className="font-semibold text-slate-900 dark:text-white">
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
                  )}

                  {/* Total Trip Price Summary Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11192e] border-2 border-primary/20 dark:border-accent/40 shadow-md dark:shadow-lg dark:shadow-black/20 flex items-baseline justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {dict.get(locale, 'experience.totalTripPrice')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        {dict.get(locale, 'experience.secureBookingNotice')}
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
                          className="font-hornbill font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="text-2xl font-hornbill text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Primary Decision Action: Proceed to Checkout */}
                <div className="relative z-10 p-5 sm:p-6 bg-slate-50 dark:bg-[#090e1a] pt-0 transition-colors duration-300">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full font-bold shadow-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-base shadow-accent/30 cursor-pointer rounded-xl"
                    disabled={!canBook || loadingPrice}
                    onClick={onProceedToCheckout}
                  >
                    {loadingPrice ? (
                      <span>{dict.get(locale, 'experience.updatingCalculation') || 'Updating calculation...'}</span>
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
                      <span>{dict.get(locale, 'experience.configureBooking') || 'Configure Booking'}</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar (Auto-hides smoothly when user is at the Journey Composer Card) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-r from-[#1a1e4e]/95 via-[#252a6b]/95 to-[#2e3192]/95 dark:bg-[#171514]/95 dark:bg-none text-white backdrop-blur-md border-t border-accent/30 lg:hidden flex items-center justify-between gap-4 shadow-2xl transition-all duration-300 ease-out transform ${
          isCardInView
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
        aria-hidden={isCardInView}
      >
        <div>
          <span className="text-xs text-[#F58220] dark:text-accent font-semibold block">
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
          <span className="text-xs text-white/70 block mt-0.5">
            {totalGuests} {guestUnit}{data.formattedDuration ? ` · ${data.formattedDuration}` : ''}
          </span>
        </div>
        <Button
          variant="accent"
          size="md"
          className="font-bold shadow-lg shadow-accent/20 flex-1 max-w-[200px] active:scale-[0.98] transition-all text-sm cursor-pointer"
          disabled={!canBook || loadingPrice}
          onClick={handleScrollToComposer}
        >
          {loadingPrice
            ? (dict.get(locale, 'experience.updatingCalculation') || 'Updating...')
            : dict.get(locale, 'experience.reviewJourney')}
        </Button>
      </div>

      {/* 5. FOCUSED PRESENTATION MODALS & DRAWERS (Progressive Disclosure) */}

      {/* Departure Selection Modal */}
      <DepartureSelectionModal
        isOpen={isDepartureModalOpen}
        onClose={() => setIsDepartureModalOpen(false)}
        isFixedPackage={isFixedPackage}
        isFlexiblePackage={isFlexiblePackage}
        isDailyTour={isDailyTour}
        availableDepartures={availableDepartures}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
        selectedDate={selectedDate}
        minDate={minDate}
        onSelectDate={onSelectDate}
        calculatedEndDate={calculatedEndDate}
        isSelectedDateBlackedOut={isSelectedDateBlackedOut}
        formattedDuration={data.formattedDuration}
        schedules={data.schedules}
        selectedTime={selectedTime}
        onSelectTime={onSelectTime}
        isTimeSlotInPast={isTimeSlotInPast}
        locale={locale}
      />

      {/* Travellers Modal */}
      <TravellersModal
        isOpen={isTravellersModalOpen}
        onClose={() => setIsTravellersModalOpen(false)}
        adults={adults}
        childrenCount={childrenCount}
        childAges={childAges}
        childBeddingModes={childBeddingModes}
        childrenAllowed={childrenAllowed}
        onAdultsChange={onAdultsChange}
        onAddChild={onAddChild}
        onRemoveChild={onRemoveChild}
        onChildAgeChange={onChildAgeChange}
        onChildBeddingChange={onChildBeddingChange}
        locale={locale}
      />

      {/* Room Arrangement Modal (Existing) */}
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

      {/* Accommodation Selection Modal (Existing) */}
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
