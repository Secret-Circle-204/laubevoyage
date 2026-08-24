'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge, Card, Rating, CurrencyDisplay, Button } from '@/components/ui'
import type { ExperienceDetailsDTO } from '@/application/experience/dto-details'
import { useCurrency } from '@/providers'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import type { ConvertedPrice } from '@/domains/currency/types'

export function ExperienceDetailsPage({ data }: { data: ExperienceDetailsDTO }) {
  const router = useRouter()
  const { currency } = useCurrency()

  const isFixedPackage = data.type === 'package' && data.packageMode === 'fixed_date'
  const isFlexiblePackage = data.type === 'package' && data.packageMode === 'flexible_date'
  const isDailyTour = data.type === 'daily_tour'

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

  const [adults, setAdults] = useState<number>(data.initialAdults)

  const [pricingState, setPricingState] = useState<{
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
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

  useEffect(() => {
    // Skip initial fetch on mount since the server pre-rendered the initial totalPrice
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let active = true

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
        currency,
      })

      if (!active) return

      if (res.success && res.pricing) {
        setPricingState(res.pricing)
        setPricingError(null)
      } else {
        setPricingState(null)
        setPricingError(res.error || 'The selected date/time is currently unavailable.')
      }
      setLoadingPrice(false)
    }

    updatePrice()
    return () => {
      active = false
    }
  }, [adults, currency, selectedSlotId, selectedDate, selectedTime, isSelectedTimeInPast, isSelectedDateBlackedOut, data.id, isFixedPackage, isDailyTour, isFlexiblePackage])

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

    if (isFixedPackage && selectedSlotId) {
      router.push(`/checkout/new?experienceId=${data.id}&slotId=${selectedSlotId}&adults=${adults}`)
    } else if (isFlexiblePackage && selectedDate) {
      // Flexible Package Date-driven Checkout URL
      router.push(
        `/checkout/new?experienceId=${data.id}&date=${selectedDate}&adults=${adults}`,
      )
    } else if (isDailyTour && selectedDate && selectedTime) {
      // Slot-less Daily Tour Checkout URL
      router.push(
        `/checkout/new?experienceId=${data.id}&date=${selectedDate}&startTime=${selectedTime}&adults=${adults}`,
      )
    }
  }

  const displayPrice = pricingState?.totalPrice ?? null

  return (
    <div className="py-16 bg-white dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/experiences">
          <Button variant="ghost" size="sm" className="mb-8">
            ← Back to Experiences Catalog
          </Button>
        </Link>

        {/* Top Section */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="primary">
                {data.type === 'package' ? 'Tour Package' : 'Daily Tour'}
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
                  <span className="text-xs text-slate-400 block font-medium">Price Per Person</span>
                  {pricingState?.unitPrice ? (
                    <CurrencyDisplay price={pricingState.unitPrice} className="text-2xl font-bold" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">—</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Total Cost</span>
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
                    <span>⚠️</span> {
                      isFixedPackage
                        ? 'This package currently has no upcoming available departure slots.'
                        : isDailyTour
                          ? 'This tour currently has no available departure schedules.'
                          : 'This journey is currently unavailable for booking.'
                    }
                  </div>
                  <Link href="/experiences" className="w-full">
                    <Button variant="outline" size="lg" className="w-full font-bold">
                      Explore Other Experiences →
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Passengers selector */}
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Adult Passengers
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <button
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                      >
                        -
                      </button>
                      <span className="font-bold text-base">{adults}</span>
                      <button
                        onClick={() => setAdults(adults + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Fixed Package Slot Picker */}
                  {isFixedPackage && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Select Departure Slot
                      </label>
                      {data.departureSlots && data.departureSlots.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                          {data.departureSlots.map((slot) => {
                            const isAvailable = slot.status === 'available' && slot.availableSeats > 0
                            return (
                              <button
                                key={slot.id}
                                disabled={!isAvailable}
                                onClick={() => setSelectedSlotId(slot.id)}
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
                                  {isAvailable ? `${slot.availableSeats} Seats Left` : 'Sold Out'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                          No upcoming departure dates currently available for this package.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flexible Package Date Picker */}
                  {isFlexiblePackage && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Select Trip Start Date
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
                            <span>⚠️</span> This date is unavailable (Blackout Date).
                          </p>
                        )}
                      </div>

                      {selectedDate && calculatedEndDate && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-500">Trip Duration:</span>
                            <span>{data.formattedDuration}</span>
                          </div>
                          <div className="flex items-center justify-between font-semibold text-[#2e3192] dark:text-[#00aeef]">
                            <span>Return Date:</span>
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
                          Select Tour Date
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
                            <span>⚠️</span> This date/time is unavailable (Blackout Date).
                          </p>
                        )}
                      </div>

                      {data.schedules && data.schedules.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Select Daily Time Slot
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
                                      (Passed)
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
                              <span>⚠️</span> This departure time has already passed. Please select an upcoming time slot.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing Error Alert */}
                  {pricingError && (
                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                      {pricingError}
                    </div>
                  )}

                  {/* Total Calculation */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold">Total Cost</span>
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
                    className="w-full font-bold shadow-xl"
                    disabled={!canBook || loadingPrice}
                    onClick={handleProceedToCheckout}
                  >
                    {canBook ? 'Book This Journey →' : 'Select Available Date'}
                  </Button>
                </>
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
              <h2 className="text-3xl font-extrabold mb-4">Journey Overview</h2>
              <div
                className="prose dark:prose-invert max-w-none text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
              />
            </div>
          )}

          {/* Day by Day Itinerary */}
          {data.itinerary && data.itinerary.length > 0 && (
            <div>
              <h2 className="text-3xl font-extrabold mb-6">Detailed Day-by-Day Itinerary</h2>
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
                        Day {day.dayNumber}
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
              <h2 className="text-3xl font-extrabold mb-6">Services Checklist</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.includedServices && data.includedServices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span className="text-xl">✓</span> What`&lsquo;s Included
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
                      <span className="text-xl">✗</span> What`&lsquo;s Excluded
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
              <h2 className="text-3xl font-extrabold mb-6">Policies & Cancellation Terms</h2>
              <div
                className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: data.policiesHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
