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
  const [selectedSlotId, setSelectedSlotId] = useState<number>(data.departureSlots[0]?.id || 1)
  const [adults, setAdults] = useState<number>(data.initialAdults)

  const [pricingState, setPricingState] = useState<{
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
  }>(data.pricing)
  const [loadingPrice, setLoadingPrice] = useState(false)

  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip initial fetch on mount since the server pre-rendered the initial totalPrice
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let active = true

    async function updatePrice() {
      setLoadingPrice(true)
      const res = await resolvePricingAction({
        experienceId: data.id,
        slotId: selectedSlotId,
        adults,
        currency,
      })
      if (active && res.success && res.pricing) {
        setPricingState(res.pricing)
        setLoadingPrice(false)
      }
    }
    updatePrice()
    return () => {
      active = false
    }
  }, [adults, currency, selectedSlotId, data.id])

  const handleProceedToCheckout = () => {
    // Navigates to transactional checkout engine with experience details
    router.push(`/checkout/new?experienceId=${data.id}&slotId=${selectedSlotId}&adults=${adults}`)
  }

  const displayPrice = pricingState.totalPrice

  return (
    <div className="py-16 bg-white dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/experiences">
          <Button variant="ghost" size="sm" className="mb-8">
            ← Back to Experiences Catalog
          </Button>
        </Link>

        {/* Experience Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={data.type === 'package' ? 'primary' : 'accent'}>
                {data.type === 'package' ? 'Tour Package' : 'Daily Tour'}
              </Badge>
              <span className="text-sm font-semibold text-slate-500">📍 {data.location}</span>
              <span className="text-sm font-semibold text-slate-500">⏳ {data.durationDays} Days</span>
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

          {/* Sticky Booking & Price Calculator Box */}
          <div className="w-full lg:w-96">
            <Card variant="elevated" padding="lg" className="sticky top-28 flex flex-col gap-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Price Per Person
                </span>
                <CurrencyDisplay price={pricingState.unitPrice} size="xl" />
                <span className="text-xs text-slate-500 block mt-1">Per Person • Taxes Included</span>
              </div>

              {/* Passengers Counter */}
              <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold">Adult Passengers</span>
                <div className="flex items-center gap-3">
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

              {/* Slot Picker */}
              {data.departureSlots && data.departureSlots.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Select Departure Slot
                  </label>
                  <div className="flex flex-col gap-2">
                    {data.departureSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                          selectedSlotId === slot.id
                            ? 'border-[#00aeef] bg-[#00aeef]/10 text-[#00aeef]'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span>{slot.departureDate}</span>
                        <span className="opacity-75">{slot.availableSeats} Seats Left</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Calculation */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold">Total Cost</span>
                <div className={loadingPrice ? 'opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}>
                  <CurrencyDisplay price={displayPrice} size="lg" />
                </div>
              </div>

              <Button variant="accent" size="lg" className="w-full font-bold shadow-xl" onClick={handleProceedToCheckout}>
                Book This Journey →
              </Button>
            </Card>
          </div>
        </div>

        {/* Gallery Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          {data.images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="h-72 rounded-2xl bg-cover bg-center shadow-lg"
              style={{ backgroundImage: `url(${imgUrl})` }}
            />
          ))}
        </div>

        {/* Overview & Itinerary */}
        <div className="max-w-4xl space-y-12">
          <div>
            <h2 className="text-3xl font-extrabold mb-4">Journey Overview</h2>
            <div
              className="prose dark:prose-invert max-w-none text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
            />
          </div>

          {/* Day by Day Itinerary */}
          {data.itinerary.length > 0 && (
            <div>
              <h2 className="text-3xl font-extrabold mb-6">Detailed Day-by-Day Itinerary</h2>
              <div className="flex flex-col gap-6">
                {data.itinerary.map((day) => (
                  <Card key={day.dayNumber} variant="flat" padding="md" className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="primary" size="sm">
                        Day {day.dayNumber}
                      </Badge>
                      <h3 className="text-lg font-bold">{day.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {day.description}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
