'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge, Card, Rating, CurrencyDisplay, Button } from '@/components/ui'
import type { ExperienceDetailsDTO, FormattedCommercialBreakdown } from '@/application/experience/dto-details'
import { useCurrency, useLocale } from '@/providers'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import type { ConvertedPrice } from '@/domains/currency/types'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export function ExperienceDetailsPage({ data }: { data: ExperienceDetailsDTO }) {
  const router = useRouter()
  const { currency } = useCurrency()
  const { locale } = useLocale()

  const isPackage = data.type === 'package'
  const isFixedPackage = data.type === 'package' && data.packageMode === 'fixed_date'
  const isFlexiblePackage = data.type === 'package' && data.packageMode === 'flexible_date'
  const isDailyTour = data.type === 'daily_tour'
  const childPolicy = isPackage ? (data as any).childPolicy : undefined
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
    commercialBreakdown?: any
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
    <div className="py-16 bg-white dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/experiences">
          <Button variant="ghost" size="sm" className="mb-8">
            {dict.get(locale, 'experience.backToCatalog')}
          </Button>
        </Link>

        {/* Top Section */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="primary">
                {data.type === 'package'
                  ? dict.get(locale, 'catalog.packageLabel')
                  : dict.get(locale, 'catalog.dailyTourLabel')}
              </Badge>
              <span className="text-sm font-semibold text-slate-500">
                📍 {data.location}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                ⏳ {data.formattedDuration}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {data.title}
            </h1>
            <p className="text-lg text-[#00aeef] dark:text-[#00aeef] mt-3 leading-relaxed font-semibold">
              {data.subtitle}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <Rating value={data.rating} reviewsCount={data.reviewsCount} size="md" />
            </div>
          </div>

          {/* Booking Card Widget */}
          <div className="w-full lg:w-96">
            <Card className="p-6 shadow-xl border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-8">
              <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    {dict.get(locale, 'experience.fromPerAdult')}
                  </span>
                  {pricingState?.unitPrice ? (
                    <CurrencyDisplay price={pricingState.unitPrice} className="text-2xl font-bold" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">—</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    {dict.get(locale, 'experience.totalCost')}
                  </span>
                  {displayPrice ? (
                    <CurrencyDisplay price={displayPrice} className="text-2xl font-black text-[#2e3192] dark:text-[#00aeef]" />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">—</span>
                  )}
                </div>
              </div>

              {!data.bookability.isBookable ? (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm font-semibold text-center leading-relaxed">
                    <span>⚠️</span>{' '}
                    {isFixedPackage
                      ? dict.get(locale, 'experience.empty.noPackageSlots')
                      : isDailyTour
                        ? dict.get(locale, 'experience.empty.noTourSchedules')
                        : dict.get(locale, 'experience.empty.unavailable')}
                  </div>
                  <Link href="/experiences" className="w-full">
                    <Button variant="outline" size="lg" className="w-full font-bold">
                      {dict.get(locale, 'experience.empty.exploreOther')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Fixed Package Slot Picker */}
                  {isFixedPackage && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {dict.get(locale, 'experience.selectDepartureSlot')}
                      </label>
                      {data.departureSlots && data.departureSlots.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {data.departureSlots.map((slot) => {
                            const isAvailable = slot.status === 'available' && slot.availableSeats > 0
                            const isSoldOut = slot.status === 'sold_out' || (slot.status === 'available' && slot.availableSeats <= 0)
                            const isUnavailable = slot.status === 'blacked_out' || slot.status === 'cancelled'

                            return (
                              <button
                                key={slot.id}
                                disabled={!isAvailable}
                                onClick={() => isAvailable && setSelectedSlotId(slot.id)}
                                className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                                  selectedSlotId === slot.id
                                    ? 'border-[#00aeef] bg-[#00aeef]/10 text-[#00aeef]'
                                    : isAvailable
                                      ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      : 'opacity-50 border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed'
                                }`}
                              >
                                <span>📅 {slot.departureDate}</span>
                                <span className="opacity-75">
                                  {isAvailable ? (
                                    slot.availableSeats === 1
                                      ? dict.get(locale, 'experience.seatLeftSingle')
                                      : dict.get(locale, 'experience.seatsLeft').replace('{count}', String(slot.availableSeats))
                                  ) : isSoldOut ? (
                                    dict.get(locale, 'experience.soldOut')
                                  ) : isUnavailable ? (
                                    dict.get(locale, 'experience.unavailable')
                                  ) : (
                                    dict.get(locale, 'experience.closed')
                                  )}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                          {dict.get(locale, 'experience.noUpcomingDates')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flexible Package Date Picker */}
                  {isFlexiblePackage && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          {dict.get(locale, 'experience.selectStartDate')}
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          min={minDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm font-semibold focus:outline-none focus:border-[#00aeef]"
                        />
                        {isSelectedDateBlackedOut && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {dict.get(locale, 'experience.blackoutDateNotice')}
                          </p>
                        )}
                      </div>

                      {selectedDate && calculatedEndDate && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-500">{dict.get(locale, 'experience.tripDuration')}</span>
                            <span>{data.formattedDuration}</span>
                          </div>
                          <div className="flex items-center justify-between font-semibold text-[#2e3192] dark:text-[#00aeef]">
                            <span>{dict.get(locale, 'experience.returnDate')}</span>
                            <span>🏁 {calculatedEndDate}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daily Tour Schedule & Date Picker */}
                  {isDailyTour && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          {dict.get(locale, 'experience.selectTourDate')}
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          min={minDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm font-semibold focus:outline-none focus:border-[#00aeef]"
                        />
                        {isSelectedDateBlackedOut && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {dict.get(locale, 'experience.blackoutDateTimeNotice')}
                          </p>
                        )}
                      </div>

                      {data.schedules && data.schedules.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            {dict.get(locale, 'experience.selectDailyTimeSlot')}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {data.schedules.map((schedule) => {
                              const isSlotPast = isTimeSlotInPast(schedule.startTime)
                              return (
                                <button
                                  key={schedule.startTime}
                                  disabled={isSlotPast}
                                  onClick={() => !isSlotPast && setSelectedTime(schedule.startTime)}
                                  className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                                    isSlotPast
                                      ? 'opacity-40 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed text-slate-400'
                                      : selectedTime === schedule.startTime
                                        ? 'border-[#00aeef] bg-[#00aeef]/10 text-[#00aeef]'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                  <span>🕒 {schedule.startTime}</span>
                                  {isSlotPast ? (
                                    <span className="block text-[10px] text-rose-500 mt-0.5 font-medium">
                                      {dict.get(locale, 'experience.passed')}
                                    </span>
                                  ) : schedule.label ? (
                                    <span className="block text-[10px] opacity-75 mt-0.5">
                                      {schedule.label}
                                    </span>
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                          {isSelectedTimeInPast && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                              <span>⚠️</span> {dict.get(locale, 'experience.timePassedNotice')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-Adjustment Notification Notice */}
                  {pricingState?.commercialBreakdown?.autoAdjusted && pricingState.commercialBreakdown.adjustmentMessage && (
                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-semibold flex items-start gap-2 shadow-xs">
                      <span className="text-base">💡</span>
                      <span>{pricingState.commercialBreakdown.adjustmentMessage}</span>
                    </div>
                  )}

                  {/* Guests & Room Configuration Section */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/50 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        {dict.get(locale, 'experience.whoIsTravelling')}
                      </span>
                      <span className="text-[11px] font-semibold text-[#2e3192] dark:text-[#00aeef]">
                        {adults} {adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')}
                        {childrenCount > 0 ? ` • ${childrenCount} ${childrenCount === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}` : ''}
                        {isPackage ? ` • ${requestedRooms} ${requestedRooms === 1 ? dict.get(locale, 'experience.roomSingular') : dict.get(locale, 'experience.roomPlural')}` : ''}
                      </span>
                    </div>

                    {/* Adults Selector */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold block">{dict.get(locale, 'experience.adults')}</span>
                        <span className="text-[11px] text-slate-400">{dict.get(locale, 'experience.adultsAgeHint')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={dict.get(locale, 'experience.aria.decreaseAdults')}
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="font-bold text-sm w-4 text-center">{adults}</span>
                        <button
                          type="button"
                          aria-label={dict.get(locale, 'experience.aria.increaseAdults')}
                          onClick={() => setAdults(adults + 1)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Children Selector (if allowed) */}
                    {isPackage && childrenAllowed && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-3">
                        <div>
                          <span className="text-sm font-bold block">{dict.get(locale, 'experience.children')}</span>
                          <span className="text-[11px] text-slate-400">{dict.get(locale, 'experience.childrenAgeHint')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={dict.get(locale, 'experience.aria.decreaseChildren')}
                            onClick={() => handleRemoveChild(childrenCount - 1)}
                            disabled={childrenCount === 0}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{childrenCount}</span>
                          <button
                            type="button"
                            aria-label={dict.get(locale, 'experience.aria.increaseChildren')}
                            onClick={handleAddChild}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Individual Child Ages and Bedding Options */}
                    {childrenCount > 0 && (
                      <div className="flex flex-col gap-3 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                        {childAges.map((age, idx) => {
                          const isInfant = age < 2
                          const currentMode = childBeddingModes[idx] || 'sharing_bed'
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#2e3192] dark:text-[#00aeef]">
                                  {dict.get(locale, 'experience.childIndex').replace('{index}', String(idx + 1))}
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] text-slate-500 font-medium">
                                    {dict.get(locale, 'experience.ageLabel')}
                                  </label>
                                  <select
                                    value={age}
                                    onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                                    className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-bold"
                                  >
                                    {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                                      <option key={a} value={a}>
                                        {a} {a === 1 ? dict.get(locale, 'experience.yearSingular') : dict.get(locale, 'experience.yearPlural')} {a < 2 ? dict.get(locale, 'experience.infantCategory') : a >= 12 ? dict.get(locale, 'experience.adultCategory') : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {isInfant ? (
                                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg">
                                  {dict.get(locale, 'experience.infantSharingNotice')}
                                </div>
                              ) : age < 12 ? (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                    {dict.get(locale, 'experience.beddingPreference')}
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleChildBeddingChange(idx, 'sharing_bed')}
                                      className={`p-2.5 rounded-xl border text-left transition-all ${
                                        currentMode === 'sharing_bed'
                                          ? 'border-[#00aeef] bg-[#00aeef]/10 text-[#00aeef] shadow-sm'
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className="block font-bold text-xs text-slate-900 dark:text-slate-100">
                                        {dict.get(locale, 'experience.sharingBed')}
                                      </span>
                                      {childPolicy?.childSharingPrice?.formatted && (
                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                          +{childPolicy.childSharingPrice.formatted}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        {dict.get(locale, 'experience.percentOfBaseRate').replace('{percentage}', String(childSharingBedPercentage))}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleChildBeddingChange(idx, 'extra_bed')}
                                      className={`p-2.5 rounded-xl border text-left transition-all ${
                                        currentMode === 'extra_bed'
                                          ? 'border-[#00aeef] bg-[#00aeef]/10 text-[#00aeef] shadow-sm'
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className="block font-bold text-xs text-slate-900 dark:text-slate-100">
                                        {dict.get(locale, 'experience.extraBed')}
                                      </span>
                                      {childPolicy?.childExtraBedPrice?.formatted && (
                                        <span className="text-[11px] font-semibold text-[#2e3192] dark:text-[#00aeef] block mt-0.5">
                                          +{childPolicy.childExtraBedPrice.formatted}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        {dict.get(locale, 'experience.percentOfBaseRate').replace('{percentage}', String(childExtraBedPercentage))}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-lg">
                                  {dict.get(locale, 'experience.adultRateNotice')}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Rooms Selector */}
                    {isPackage && (
                      <div className="flex flex-col gap-1 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold block">{dict.get(locale, 'experience.rooms')}</span>
                            <span className="text-[11px] text-slate-400">{dict.get(locale, 'experience.totalRequestedRooms')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              aria-label={dict.get(locale, 'experience.aria.decreaseRooms')}
                              disabled={requestedRooms <= (pricingState?.commercialBreakdown?.minimumRequiredRooms || 1)}
                              onClick={() => setRequestedRooms(Math.max(pricingState?.commercialBreakdown?.minimumRequiredRooms || 1, requestedRooms - 1))}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm w-4 text-center">{requestedRooms}</span>
                            <button
                              type="button"
                              aria-label={dict.get(locale, 'experience.aria.increaseRooms')}
                              onClick={() => setRequestedRooms(requestedRooms + 1)}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {pricingState?.commercialBreakdown?.minimumRequiredRooms && pricingState.commercialBreakdown.minimumRequiredRooms > 1 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {dict.get(locale, 'experience.minimumRoomsRequired')
                              .replace('{min}', String(pricingState.commercialBreakdown.minimumRequiredRooms))
                              .replace('{adults}', String(adults))
                              .replace('{adultUnit}', adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural'))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Room Allocation Display (Domain-Resolved) */}
                  {isPackage && pricingState?.commercialBreakdown?.roomAllocation && pricingState.commercialBreakdown.roomAllocation.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-2.5">
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span>🛏️</span>
                          <span className="uppercase tracking-wider text-[11px] font-extrabold text-slate-500">
                            {dict.get(locale, 'experience.yourRooms')}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {pricingState.commercialBreakdown.roomCount} {pricingState.commercialBreakdown.roomCount === 1 ? dict.get(locale, 'experience.roomSingular') : dict.get(locale, 'experience.roomPlural')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pricingState.commercialBreakdown.roomAllocation.map((room: any) => (
                          <div
                            key={room.roomIndex}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {dict.get(locale, 'experience.roomIndex').replace('{index}', String(room.roomIndex))}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {room.adults} {room.adults === 1 ? dict.get(locale, 'experience.adultSingular') : dict.get(locale, 'experience.adultPlural')}
                                {room.children > 0 ? ` • ${room.children} ${room.children === 1 ? dict.get(locale, 'experience.childSingular') : dict.get(locale, 'experience.childPlural')}` : ''}
                              </span>
                            </div>
                            <Badge variant="outline" size="sm" className="capitalize text-[11px] font-bold">
                              {dict.get(locale, `experience.occupancy.${room.occupancy}Room`)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing Error Alert */}
                  {pricingError && (
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex flex-col gap-1 leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>⚠️</span>
                        <span>{pricingError}</span>
                      </div>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-normal">
                        {dict.get(locale, 'experience.pricingErrorHint')}
                      </p>
                    </div>
                  )}

                  {/* Authoritative Live Price Breakdown */}
                  {pricingState?.commercialBreakdown && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200/50 dark:border-slate-700/50">
                        <span className="uppercase tracking-wider text-[11px] font-extrabold text-slate-500">
                          {dict.get(locale, 'experience.priceBreakdown')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {dict.get(locale, 'experience.commercialSsotBadge')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">
                          {dict.get(locale, 'experience.adultsCalculation')
                            .replace('{count}', String(pricingState.commercialBreakdown.adultsCount))
                            .replace('{price}', pricingState.formattedBreakdown?.adultBasePrice.formatted || pricingState.unitPrice.formatted)}
                        </span>
                        <span className="font-semibold">
                          {pricingState.formattedBreakdown?.adultsTotalPrice.formatted || pricingState.totalPrice.formatted}
                        </span>
                      </div>
                      {pricingState.commercialBreakdown.children && pricingState.commercialBreakdown.children.length > 0 && (
                        pricingState.commercialBreakdown.children.map((ch: any, idx: number) => {
                          const formattedCh = pricingState.formattedBreakdown?.children?.[idx]
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-slate-500">
                                {dict.get(locale, 'experience.childCalculation')
                                  .replace('{index}', String(idx + 1))
                                  .replace('{age}', String(ch.age))
                                  .replace('{mode}', ch.category === 'infant' ? dict.get(locale, 'experience.infantCategory') : ch.beddingMode === 'sharing_bed' ? dict.get(locale, 'experience.sharingBed') : dict.get(locale, 'experience.extraBed'))}
                              </span>
                              <span className="font-semibold">
                                {ch.priceEGP === 0 ? dict.get(locale, 'experience.free') : (formattedCh?.price.formatted || '')}
                              </span>
                            </div>
                          )
                        })
                      )}
                      {pricingState.commercialBreakdown.occupancySupplementsTotalEGP > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">
                            {dict.get(locale, 'experience.roomSupplements')}
                          </span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            +{pricingState.formattedBreakdown?.occupancySupplementsTotalPrice.formatted || ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Calculation */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold">
                      {dict.get(locale, 'experience.totalCost')}
                    </span>
                    <div
                      className={
                        loadingPrice
                          ? 'opacity-50 transition-opacity duration-200'
                          : 'transition-opacity duration-200'
                      }
                    >
                      {displayPrice ? (
                        <CurrencyDisplay price={displayPrice} size="lg" />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">—</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full font-bold shadow-xl py-4 flex items-center justify-center gap-2"
                    disabled={!canBook || loadingPrice}
                    onClick={handleProceedToCheckout}
                  >
                    {loadingPrice ? (
                      <span>{dict.get(locale, 'experience.updatingCalculation')}</span>
                    ) : displayPrice ? (
                      <span>{displayPrice.formatted} • {dict.get(locale, 'experience.bookThisJourney')}</span>
                    ) : (
                      <span>{dict.get(locale, 'experience.configureBooking')}</span>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Gallery Images (Legitimate Empty State when no media exists) */}
        {data.images && data.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
            {data.images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="h-72 rounded-2xl bg-cover bg-center shadow-lg bg-slate-100 dark:bg-slate-900"
                style={{ backgroundImage: `url(${imgUrl})` }}
              />
            ))}
          </div>
        )}

        {/* Overview & Sections */}
        <div className="max-w-4xl space-y-12">
          {data.descriptionHtml && (
            <div>
              <h2 className="text-3xl font-extrabold mb-4">
                {dict.get(locale, 'experience.journeyOverview')}
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
              />
            </div>
          )}

          {/* Accommodation & Stays Showcase for Packages */}
          {isPackage && data.accommodations && data.accommodations.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🏨</span>
                <div>
                  <h2 className="text-3xl font-extrabold">
                    {dict.get(locale, 'experience.staysTitle')}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {dict.get(locale, 'experience.staysSubtitle')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.accommodations.map((stay) => (
                  <Card
                    key={stay.order}
                    variant="flat"
                    padding="md"
                    className="flex flex-col gap-4 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="primary" size="sm" className="mb-2">
                          {dict.get(locale, 'experience.stayHeader')
                            .replace('{order}', String(stay.order))
                            .replace('{nights}', String(stay.nights))
                            .replace('{nightUnit}', stay.nights === 1 ? dict.get(locale, 'experience.nightSingular') : dict.get(locale, 'experience.nightPlural'))}
                        </Badge>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{stay.propertyName}</h3>
                        {stay.roomCategory && (
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                            <span>🛏️ {dict.get(locale, 'experience.roomLabel')}</span>
                            <span className="text-slate-900 dark:text-slate-100 font-bold">{stay.roomCategory}</span>
                          </div>
                        )}
                      </div>
                      {stay.boardBasis && (
                        <Badge variant="outline" size="sm" className="capitalize text-xs font-bold bg-white dark:bg-slate-800">
                          🍽️ {dict.get(locale, `experience.boardBasis.${stay.boardBasis}`)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl">
                      <span>✨</span>
                      <span>{dict.get(locale, 'experience.includedInItinerary')}</span>
                    </div>

                    {/* Occupancy Options Preview */}
                    {stay.occupancyOptions && stay.occupancyOptions.length > 0 && (
                      <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3 mt-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          {dict.get(locale, 'experience.supportedOccupancyOptions')}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {stay.occupancyOptions.map((opt) => (
                            <div
                              key={opt.occupancy}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs"
                            >
                              <span className="font-bold block text-slate-900 dark:text-slate-100">{opt.label}</span>
                              <span className="text-[11px] font-semibold mt-1 block">
                                {opt.supplementEGP === 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {dict.get(locale, 'experience.includedInBase')}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    +{opt.supplementPrice?.formatted || ''}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Day by Day Itinerary */}
          {data.itinerary && data.itinerary.length > 0 && (
            <div>
              <h2 className="text-3xl font-extrabold mb-6">
                {dict.get(locale, 'experience.itineraryTitle')}
              </h2>
              <div className="flex flex-col gap-6">
                {data.itinerary.map((day) => (
                  <Card
                    key={day.dayNumber}
                    variant="flat"
                    padding="md"
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="primary" size="sm">
                        {dict.get(locale, 'experience.itineraryDay').replace('{day}', String(day.dayNumber))}
                      </Badge>
                      <h3 className="text-lg font-bold">{day.title}</h3>
                    </div>
                    {day.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                        {day.description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Included / Excluded Services Checklist */}
          {((data.includedServices && data.includedServices.length > 0) ||
            (data.excludedServices && data.excludedServices.length > 0)) && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
              <h2 className="text-3xl font-extrabold mb-6">
                {dict.get(locale, 'experience.servicesTitle')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.includedServices && data.includedServices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span className="text-xl">✓</span> {dict.get(locale, 'experience.whatsIncluded')}
                    </h3>
                    <ul className="space-y-3">
                      {data.includedServices.map((service, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.excludedServices && data.excludedServices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <span className="text-xl">✗</span> {dict.get(locale, 'experience.whatsExcluded')}
                    </h3>
                    <ul className="space-y-3">
                      {data.excludedServices.map((service, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Policies & Booking Terms */}
          {data.policiesHtml && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
              <h2 className="text-3xl font-extrabold mb-6">
                {dict.get(locale, 'experience.policiesTitle')}
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: data.policiesHtml }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden flex items-center justify-between gap-4 shadow-2xl">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {dict.get(locale, 'experience.totalPrice')}
          </span>
          {displayPrice ? (
            <CurrencyDisplay price={displayPrice} className="text-xl font-black text-[#2e3192] dark:text-[#00aeef]" />
          ) : (
            <span className="text-lg font-bold text-slate-400">—</span>
          )}
        </div>
        <Button
          variant="accent"
          size="lg"
          className="font-bold shadow-lg flex-1 max-w-[220px]"
          disabled={!canBook || loadingPrice}
          onClick={handleProceedToCheckout}
        >
          {loadingPrice ? dict.get(locale, 'experience.updatingCalculation') : dict.get(locale, 'experience.bookJourneyShort')}
        </Button>
      </div>
    </div>
  )
}
