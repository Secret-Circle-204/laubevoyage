'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  ExperienceDetailsDTO,
  FormattedCommercialBreakdown,
  ChildPolicyDTO,
  AccommodationStayDTO,
} from '@/application/experience/dto-details'
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import { useCurrency, useLocale } from '@/providers'
import { useTheme } from '@/providers/theme-provider'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import type { ConvertedPrice } from '@/domains/currency/types'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

import { ExperienceHero } from './ExperienceHero'
import { JourneySummary } from './JourneySummary'
import { JourneyItinerary } from './JourneyItinerary'
import { StayDossier } from './StayDossier'
import { ProvisionsLedger } from './ProvisionsLedger'
import { JourneyControl } from './JourneyControl'

const dict = new JsonTranslationDictionary()

function ChevronLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

export function ExperienceDetailsPage({ data }: { data: ExperienceDetailsDTO }) {
  const router = useRouter()
  const { currency } = useCurrency()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const isPackage = data.type === 'package'
  const isFixedPackage = data.type === 'package' && data.packageMode === 'fixed_date'
  const isFlexiblePackage = data.type === 'package' && data.packageMode === 'flexible_date'
  const isDailyTour = data.type === 'daily_tour'

  const childPolicy: ChildPolicyDTO | undefined = isPackage ? (data as { childPolicy?: ChildPolicyDTO }).childPolicy : undefined
  const childrenAllowed = isPackage ? (childPolicy?.childrenAllowed ?? true) : false
  const childSharingBedPercentage = childPolicy?.childSharingBedPercentage ?? 50
  const childExtraBedPercentage = childPolicy?.childExtraBedPercentage ?? 75

  // Package Slot Selection (Fixed Package only)
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(
    isFixedPackage ? data.bookability.defaultSlotId : null,
  )

  // Date Selection (Flexible Package & Daily Tour)
  const initialDate = isFlexiblePackage
    ? data.bookability.initialSuggestedStartDate
    : isDailyTour
      ? (data.bookability.initialSuggestedDate || '')
      : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)

  // Time Selection (Daily Tour only)
  const initialTime = isDailyTour ? (data.bookability.initialSuggestedTime || '') : ''
  const [selectedTime, setSelectedTime] = useState<string>(initialTime)

  const minDate = isFlexiblePackage
    ? data.bookability.minStartDate
    : isDailyTour
      ? data.bookability.minDate
      : ''

  // Commercial Guests & Room Configuration
  const [adults, setAdults] = useState<number>(data.initialAdults)
  const [childrenCount, setChildrenCount] = useState<number>(0)
  const [childAges, setChildAges] = useState<number[]>([])
  const [childBeddingModes, setChildBeddingModes] = useState<('sharing_bed' | 'extra_bed')[]>([])
  const [requestedRooms, setRequestedRooms] = useState<number>(1)

  const [pricingState, setPricingState] = useState<{
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
    commercialBreakdown?: CommercialSnapshotBreakdown
    formattedBreakdown?: FormattedCommercialBreakdown
  } | null>(data.pricing)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Calculated End Date for Flexible Package: Start Date + (durationDays - 1)
  const calculatedEndDate = React.useMemo(() => {
    if (!isFlexiblePackage || !selectedDate || data.type !== 'package') return null
    const start = new Date(selectedDate)
    const durationDays = data.durationDays
    const end = new Date(start.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000)
    return end.toISOString().split('T')[0]
  }, [isFlexiblePackage, selectedDate, data.durationDays, data.type])

  // Fast UX blackout check (defense in depth)
  const isSelectedDateBlackedOut = React.useMemo(() => {
    if (isFixedPackage || !data.blackouts || data.blackouts.length === 0 || !selectedDate) return false
    const cleanDate = selectedDate.split('T')[0]
    return data.blackouts.some((b) => {
      const bDate = b.date ? b.date.split('T')[0] : ''
      if (bDate !== cleanDate) return false
      if (!b.startTime || b.startTime === 'all') return true
      return isDailyTour && selectedTime ? b.startTime === selectedTime : true
    })
  }, [isFixedPackage, isDailyTour, data.blackouts, selectedDate, selectedTime])

  const isTimeSlotInPast = React.useCallback((timeStr: string) => {
    if (!selectedDate || !data.destinationTimezone) return false
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: data.destinationTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const parts = formatter.formatToParts(new Date())
      const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '0'
      const destDate = `${getVal('year')}-${getVal('month')}-${getVal('day')}`
      let destHour = Number(getVal('hour'))
      if (destHour === 24) destHour = 0
      const destMin = Number(getVal('minute'))

      if (selectedDate < destDate) return true
      if (selectedDate === destDate) {
        const [h, m] = timeStr.split(':').map(Number)
        return h < destHour || (h === destHour && m <= destMin)
      }
      return false
    } catch {
      return false
    }
  }, [selectedDate, data.destinationTimezone])

  const isSelectedTimeInPast = isDailyTour && selectedTime ? isTimeSlotInPast(selectedTime) : false

  const isFirstRender = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Skip initial fetch on mount since the server pre-rendered the initial totalPrice
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let active = true
    const currentRequestId = ++requestIdRef.current

    async function updatePrice() {
      // Validate inputs before calling server action
      if (isFixedPackage && !selectedSlotId) {
        setPricingState(null)
        return
      }
      if (isFlexiblePackage && (!selectedDate || isSelectedDateBlackedOut)) {
        setPricingState(null)
        return
      }
      if (isDailyTour && (!selectedDate || !selectedTime || isSelectedTimeInPast || isSelectedDateBlackedOut)) {
        setPricingState(null)
        return
      }

      setLoadingPrice(true)
      setPricingError(null)

      const res = await resolvePricingAction({
        experienceId: data.id,
        slotId: isFixedPackage && selectedSlotId ? selectedSlotId : undefined,
        date: !isFixedPackage && selectedDate ? selectedDate : undefined,
        startTime: isDailyTour ? selectedTime : undefined,
        adults,
        children: childrenCount,
        childAges: childrenCount > 0 ? childAges : undefined,
        childBeddingModes: childrenCount > 0 ? childBeddingModes : undefined,
        requestedRooms: isPackage ? requestedRooms : undefined,
        currency,
      })

      if (!active || currentRequestId !== requestIdRef.current) return

      if (res.success && res.pricing) {
        setPricingState(res.pricing)
        setPricingError(null)

        // Monotonic Smart Assistant Expansion: If domain determined minimum required rooms exceeds requested, adjust up
        if (
          res.pricing.commercialBreakdown?.autoAdjusted &&
          typeof res.pricing.commercialBreakdown.roomCount === 'number' &&
          res.pricing.commercialBreakdown.roomCount > requestedRooms
        ) {
          setRequestedRooms(res.pricing.commercialBreakdown.roomCount)
        }
      } else {
        setPricingState(null)
        setPricingError(res.error || 'The selected guest configuration is currently unavailable.')
      }
      setLoadingPrice(false)
    }

    updatePrice()
    return () => {
      active = false
    }
  }, [
    adults,
    childrenCount,
    childAges,
    childBeddingModes,
    requestedRooms,
    currency,
    selectedSlotId,
    selectedDate,
    selectedTime,
    isSelectedTimeInPast,
    isSelectedDateBlackedOut,
    data.id,
    isPackage,
    isFixedPackage,
    isDailyTour,
    isFlexiblePackage,
  ])

  const handleAdultsChange = (delta: number) => {
    setAdults((prev) => Math.max(1, prev + delta))
  }

  const handleAddChild = () => {
    setChildrenCount((prev) => prev + 1)
    setChildAges((prev) => [...prev, 6])
    setChildBeddingModes((prev) => [...prev, 'sharing_bed'])
  }

  const handleRemoveChild = (index: number) => {
    setChildrenCount((prev) => Math.max(0, prev - 1))
    setChildAges((prev) => prev.filter((_, i) => i !== index))
    setChildBeddingModes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChildAgeChange = (index: number, age: number) => {
    setChildAges((prev) => {
      const next = [...prev]
      next[index] = age
      return next
    })
  }

  const handleChildBeddingChange = (index: number, mode: 'sharing_bed' | 'extra_bed') => {
    setChildBeddingModes((prev) => {
      const next = [...prev]
      next[index] = mode
      return next
    })
  }

  const handleRequestedRoomsChange = (delta: number) => {
    setRequestedRooms((prev) => Math.max(1, prev + delta))
  }

  const canBook =
    data.bookability.isBookable &&
    !loadingPrice &&
    pricingState !== null &&
    !pricingError &&
    (isFixedPackage
      ? selectedSlotId !== null
      : isFlexiblePackage
        ? Boolean(selectedDate && !isSelectedDateBlackedOut)
        : Boolean(selectedDate && selectedTime && !isSelectedTimeInPast && !isSelectedDateBlackedOut))

  const handleProceedToCheckout = () => {
    if (!canBook) return

    const query = new URLSearchParams({
      experienceId: String(data.id),
      adults: String(adults),
    })

    if (isFixedPackage && selectedSlotId) {
      query.set('slotId', String(selectedSlotId))
    } else if (isFlexiblePackage && selectedDate) {
      query.set('date', selectedDate)
    } else if (isDailyTour && selectedDate && selectedTime) {
      query.set('date', selectedDate)
      query.set('startTime', selectedTime)
    }

    if (childrenCount > 0) {
      query.set('children', String(childrenCount))
      query.set('childAges', childAges.join(','))
      query.set('childBeddingModes', childBeddingModes.join(','))
    }

    if (isPackage && requestedRooms > 1) {
      query.set('requestedRooms', String(requestedRooms))
    }

    router.push(`/checkout/new?${query.toString()}`)
  }

  const displayPrice = pricingState?.totalPrice ?? null

  return (
    <div className={`py-12 sm:py-16 ${isDark ? 'bg-[#231F20]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen text-foreground`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Trail */}
        <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground animate-editorial-reveal">
          <Link
            href="/experiences"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 text-secondary" />
            <span>{dict.get(locale, 'experience.backToCatalog')}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-muted-foreground line-clamp-1">{data.location}</span>
          <span className="text-border">/</span>
          <span className="text-foreground font-semibold line-clamp-1">{data.title}</span>
        </div>

        {/* 1. IMMERSIVE HERO & GALLERY SURFACE */}
        <ExperienceHero
          title={data.title}
          subtitle={data.subtitle}
          location={data.location}
          formattedDuration={data.formattedDuration}
          durationNights={data.durationNights}
          type={data.type}
          rating={data.rating}
          reviewsCount={data.reviewsCount}
          images={data.images || []}
          locale={locale}
        />

        {/* 2-Column Master Layout: Dossier Chronicle (Left) + Journey Control Instrument (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          
          {/* LEFT COLUMN: THE EDITORIAL CHRONICLE (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-12">
            {/* 2. JOURNEY SUMMARY */}
            <JourneySummary
              formattedDuration={data.formattedDuration}
              location={data.location}
              isPackage={isPackage}
              descriptionHtml={data.descriptionHtml}
              locale={locale}
            />

            {/* 3. ITINERARY CHRONICLE */}
            <JourneyItinerary
              itinerary={data.itinerary}
              locale={locale}
            />

            {/* 4. ACCOMMODATIONS / STAY DOSSIER */}
            {isPackage && (
              <StayDossier
                stays={(data as { accommodations?: AccommodationStayDTO[] }).accommodations}
                staysBreakdown={pricingState?.formattedBreakdown?.staysBreakdown}
                locale={locale}
              />
            )}

            {/* 5. SERVICES & POLICIES LEDGER */}
            <ProvisionsLedger
              includedServices={data.includedServices}
              excludedServices={data.excludedServices}
              policiesHtml={data.policiesHtml}
              locale={locale}
            />
          </div>

          {/* RIGHT COLUMN: THE JOURNEY CONTROL INSTRUMENT (5 Columns - Sticky) */}
          <JourneyControl
            data={data}
            locale={locale}
            isPackage={isPackage}
            isFixedPackage={isFixedPackage}
            isFlexiblePackage={isFlexiblePackage}
            isDailyTour={isDailyTour}
            childPolicy={childPolicy}
            childrenAllowed={childrenAllowed}
            childSharingBedPercentage={childSharingBedPercentage}
            childExtraBedPercentage={childExtraBedPercentage}
            displayPrice={displayPrice}
            pricingState={pricingState}
            loadingPrice={loadingPrice}
            pricingError={pricingError}
            canBook={canBook}
            selectedSlotId={selectedSlotId}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            minDate={minDate}
            calculatedEndDate={calculatedEndDate}
            isSelectedDateBlackedOut={isSelectedDateBlackedOut}
            isTimeSlotInPast={isTimeSlotInPast}
            adults={adults}
            childrenCount={childrenCount}
            childAges={childAges}
            childBeddingModes={childBeddingModes}
            requestedRooms={requestedRooms}
            onSelectSlot={setSelectedSlotId}
            onSelectDate={setSelectedDate}
            onSelectTime={setSelectedTime}
            onAdultsChange={handleAdultsChange}
            onAddChild={handleAddChild}
            onRemoveChild={handleRemoveChild}
            onChildAgeChange={handleChildAgeChange}
            onChildBeddingChange={handleChildBeddingChange}
            onRequestedRoomsChange={handleRequestedRoomsChange}
            onProceedToCheckout={handleProceedToCheckout}
          />

        </div>
      </div>
    </div>
  )
}
