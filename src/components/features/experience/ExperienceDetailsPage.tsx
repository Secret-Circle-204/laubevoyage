'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  ExperienceDetailsDTO,
  FormattedCommercialBreakdown,
  ChildPolicyDTO,
  AccommodationStayDTO,
  AccommodationOptionDTO,
} from '@/application/experience/dto-details'
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import {
  RoomAllocationPolicy,
  type RoomAllocationOption,
  type OccupancyType,
} from '@/domains/experience/room-allocation-policy'
import { useCurrency, useLocale, useToast } from '@/providers'
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

function validateAccommodationSelections(
  stays?: AccommodationStayDTO[],
  selections?: Record<number, string>,
): { complete: boolean; missingStayOrder: number | null } {
  if (!stays || stays.length === 0) return { complete: true, missingStayOrder: null }
  for (const stay of stays) {
    if (stay.options.length > 1) {
      const selectedId = selections?.[stay.order]
      if (!selectedId || typeof selectedId !== 'string' || selectedId.trim() === '') {
        return { complete: false, missingStayOrder: stay.order }
      }
    }
  }
  return { complete: true, missingStayOrder: null }
}

function resolveSupportedOccupanciesForSelections(
  stays: AccommodationStayDTO[] | undefined,
  selectedOptions: Record<number, string>,
): OccupancyType[] {
  if (!stays || stays.length === 0) {
    return ['single', 'double', 'triple', 'quad']
  }

  const enabledPerStay: Set<OccupancyType>[] = []

  for (const stay of stays) {
    const options = Array.isArray(stay.options) ? stay.options : []
    if (options.length === 0) continue

    let selectedOption: AccommodationOptionDTO | undefined
    if (options.length === 1) {
      selectedOption = options[0]
    } else {
      const selectedId = selectedOptions[stay.order]
      selectedOption = options.find((opt) => opt.id === selectedId)
    }

    if (!selectedOption) {
      continue
    }

    const enabledSet = new Set<OccupancyType>()
    if (Array.isArray(selectedOption.roomRates)) {
      for (const rate of selectedOption.roomRates) {
        if (rate.enabled !== false) {
          enabledSet.add(rate.occupancy as OccupancyType)
        }
      }
    }
    enabledPerStay.push(enabledSet)
  }

  if (enabledPerStay.length === 0) {
    return ['single', 'double', 'triple', 'quad']
  }

  const firstStay = enabledPerStay[0]
  return Array.from(firstStay).filter((occ) =>
    enabledPerStay.every((staySet) => staySet.has(occ)),
  )
}

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
  const { addToast } = useToast()
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
  // User-Customized Room Allocation Lock vs System-Generated Recommendation
  // Initial page load starts as System Recommendation (customAllocationId === null)
  const [customAllocationId, setCustomAllocationId] = useState<string | null>(null)
  const isCustomizedAllocation = customAllocationId !== null

  // Accommodation Option Selections (key: stay.order, value: option.id)
  // Authoritatively initialized from the server pricing engine resolution
  const [selectedAccommodationOptions, setSelectedAccommodationOptions] = useState<Record<number, string>>(
    () => data.pricing?.selectedAccommodationOptions || {},
  )

  const [pricingState, setPricingState] = useState<{
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
    commercialBreakdown?: CommercialSnapshotBreakdown
    formattedBreakdown?: FormattedCommercialBreakdown
    availableAllocationOptions?: RoomAllocationOption[]
    selectedAllocationId?: string
    selectedAccommodationOptions?: Record<number, string>
  } | null>(data.pricing)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Active Authoritative Allocation ID (custom user choice takes precedence if active, else server recommendation)
  const effectiveAllocationId = customAllocationId || pricingState?.selectedAllocationId || null

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

      // Reconciliation & User Intent Defense:
      // If user has an explicit customization, verify it against the newly selected accommodation's supported occupancies.
      let allocationToSend: string | undefined = undefined

      if (isPackage && customAllocationId) {
        const stays = (data as { accommodations?: AccommodationStayDTO[] }).accommodations
        const supported = resolveSupportedOccupanciesForSelections(stays, selectedAccommodationOptions)
        const validOptions = RoomAllocationPolicy.getValidAllocationOptions({
          adultsCount: adults,
          childrenCount,
          supportedOccupancies: supported,
        })
        const isStillValid = validOptions.some((opt) => opt.id === customAllocationId)

        if (isStillValid) {
          // Rule 10: Preserve valid user intent
          allocationToSend = customAllocationId
        } else {
          // Rule 6 & 11: Do not send invalid custom allocation to Pricing!
          setLoadingPrice(false)
          setPricingState((prev) =>
            prev
              ? {
                  ...prev,
                  availableAllocationOptions: validOptions,
                }
              : null,
          )
          setPricingError(
            dict.get(locale, 'experience.accommodationOptionMismatch')
          )
          return
        }
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
        selectedAllocationId: allocationToSend,
        selectedAccommodationOptions: isPackage ? selectedAccommodationOptions : undefined,
        currency,
      })

      if (!active || currentRequestId !== requestIdRef.current) return

      if (res.success && res.pricing) {
        setPricingState(res.pricing)
        // Rule 8 (Break Cascading Re-trigger):
        // Never call setSelectedAllocationId(res.pricing.selectedAllocationId) here!
        // Derived server recommendation lives in pricingState.selectedAllocationId without polluting user intent state.
        setPricingError(null)
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
    customAllocationId,
    selectedAccommodationOptions,
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
    locale,
  ])

  const handleAdultsChange = (delta: number) => {
    setCustomAllocationId(null)
    setAdults((prev) => Math.max(1, prev + delta))
  }

  const handleAddChild = () => {
    setCustomAllocationId(null)
    setChildrenCount((prev) => prev + 1)
    setChildAges((prev) => [...prev, 6])
    setChildBeddingModes((prev) => [...prev, 'sharing_bed'])
  }

  const handleRemoveChild = (index: number) => {
    setCustomAllocationId(null)
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

  const handleSelectAccommodationOption = (stayOrder: number, optionId: string) => {
    setSelectedAccommodationOptions((prev) => ({
      ...prev,
      [stayOrder]: optionId,
    }))
  }

  const accommodationValidation = isPackage
    ? validateAccommodationSelections(
        (data as { accommodations?: AccommodationStayDTO[] }).accommodations,
        selectedAccommodationOptions,
      )
    : { complete: true, missingStayOrder: null }

  const canBook =
    data.bookability.isBookable &&
    !loadingPrice &&
    pricingState !== null &&
    !pricingError &&
    accommodationValidation.complete &&
    (isFixedPackage
      ? selectedSlotId !== null
      : isFlexiblePackage
        ? Boolean(selectedDate && !isSelectedDateBlackedOut)
        : Boolean(selectedDate && selectedTime && !isSelectedTimeInPast && !isSelectedDateBlackedOut))

  const handleProceedToCheckout = () => {
    if (!accommodationValidation.complete && accommodationValidation.missingStayOrder) {
      const stayNum = accommodationValidation.missingStayOrder
      addToast({
        type: 'error',
        title: dict.get(locale, 'experience.toast.selectionRequiredTitle'),
        description: dict.get(locale, 'experience.toast.selectionRequiredMsg', { order: String(stayNum) }),
      })
      const el = document.getElementById(`stay-segment-${stayNum}`)
      el?.scrollIntoView({ behavior: 'smooth' })
      return
    }

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

    if (isPackage) {
      const pairs = Object.entries(selectedAccommodationOptions)
        .filter(([order, id]) => !isNaN(Number(order)) && Number(order) > 0 && typeof id === 'string' && id.trim() !== '')
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([order, id]) => `${order}:${id.trim()}`)
      if (pairs.length > 0) {
        query.set('accommodations', pairs.join(','))
      }
      const checkoutAllocationId = effectiveAllocationId || pricingState?.selectedAllocationId
      if (checkoutAllocationId) {
        query.set('roomAllocation', checkoutAllocationId)
      }
    }

    router.push(`/checkout/new?${query.toString()}`)
  }

  const handleApplyAllocationAsync = async (allocationId: string): Promise<boolean> => {
    // Rule 9 (Unified Race Condition Protection):
    // Increment monotonic requestIdRef shared with useEffect to discard any older in-flight requests.
    const currentRequestId = ++requestIdRef.current

    try {
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
        selectedAllocationId: allocationId,
        selectedAccommodationOptions: isPackage ? selectedAccommodationOptions : undefined,
        currency,
      })

      if (currentRequestId !== requestIdRef.current) {
        // Discard stale response
        return false
      }

      if (res.success && res.pricing) {
        setPricingState(res.pricing)
        setCustomAllocationId(res.pricing.selectedAllocationId || allocationId)
        setPricingError(null)
        setLoadingPrice(false)
        return true
      } else {
        setPricingError(res.error || 'The selected guest configuration is currently unavailable.')
        setLoadingPrice(false)
        return false
      }
    } catch (err: unknown) {
      if (currentRequestId !== requestIdRef.current) return false
      const message = err instanceof Error ? err.message : 'Failed to update pricing.'
      setPricingError(message)
      setLoadingPrice(false)
      return false
    }
  }

  const displayPrice = pricingState?.totalPrice ?? null

  return (
    <div className={`pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 ${isDark ? 'bg-[#231F20]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen text-foreground`}>
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

        {/* 2. JOURNEY SUMMARY (FULL CONTAINER WIDTH) */}
        <JourneySummary
          formattedDuration={data.formattedDuration}
          location={data.location}
          type={data.type}
          destinations={data.destinations}
          descriptionHtml={data.descriptionHtml}
          backgroundImage={data.images?.[0]}
          locale={locale}
        />

        {/* 2-Column Master Layout: Dossier Chronicle (Left) + Journey Control Instrument (Right) */}
        <div className="mt-8 sm:mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          
          {/* LEFT COLUMN: THE EDITORIAL CHRONICLE (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-12">
            {/* 3. ITINERARY CHRONICLE */}
            <JourneyItinerary
              itinerary={data.itinerary}
              locale={locale}
            />

            {/* 4. ACCOMMODATIONS / STAY DOSSIER */}
            {isPackage && (
              <StayDossier
                stays={(data as { accommodations?: AccommodationStayDTO[] }).accommodations}
                selectedAccommodationOptions={selectedAccommodationOptions}
                onSelectOption={handleSelectAccommodationOption}
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
            selectedAllocationId={effectiveAllocationId}
            selectedAccommodationOptions={selectedAccommodationOptions}
            onSelectSlot={setSelectedSlotId}
            onSelectDate={setSelectedDate}
            onSelectTime={setSelectedTime}
            onAdultsChange={handleAdultsChange}
            onAddChild={handleAddChild}
            onRemoveChild={handleRemoveChild}
            onChildAgeChange={handleChildAgeChange}
            onChildBeddingChange={handleChildBeddingChange}
            onSelectAllocation={(id) => {
              setCustomAllocationId(id)
            }}
            onApplyAllocationAsync={handleApplyAllocationAsync}
            onSelectAccommodationOption={handleSelectAccommodationOption}
            onProceedToCheckout={handleProceedToCheckout}
          />

        </div>
      </div>
    </div>
  )
}
