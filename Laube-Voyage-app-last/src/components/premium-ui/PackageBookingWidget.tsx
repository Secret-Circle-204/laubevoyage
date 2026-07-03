'use client'

import { useState, useMemo } from 'react'
import { SmartPackageCalendar } from './SmartPackageCalendar'
import type { DateRange } from './SmartPackageCalendar'
import { useRouter } from 'next/navigation'



interface PackageBookingWidgetProps {
  packageId: string
  destinationId: string
  price: number
  dates: DateRange[]
}

export function PackageBookingWidget({
  packageId,
  destinationId,
  price,
  dates,
}: PackageBookingWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null)
  const router = useRouter()

  // Compute the minimum price across all dates (for "Starting from")
  const minPrice = useMemo(() => {
    if (!dates || dates.length === 0) return price
    const datePrices = dates
      .map((d) => d.adultPrice ?? price)
      .filter((p): p is number => p != null && p > 0)
    return datePrices.length > 0 ? Math.min(...datePrices) : price
  }, [dates, price])

  // The active price based on the selected date
  const activePrice = selectedDateRange?.adultPrice ?? price

  const handleDateSelect = (date: Date, dateRange?: DateRange) => {
    setSelectedDate(date)
    setSelectedDateRange(dateRange || null)
  }

  const handleBooking = () => {
    const url = `/book?package=${packageId}&destination=${destinationId}`
    router.push(url)
  }

  return (
    <div className="sticky top-32 bg-white dark:bg-[#1a1718] border border-dark/5 dark:border-gray/10 p-8 rounded-2xl shadow-2xl transition-colors">
      <div className="text-center pb-8 border-b border-dark/5 dark:border-gray/10 mb-8">
        <p className="text-gray dark:text-gray/80 text-xs tracking-widest uppercase mb-2">
          {dates && dates.length > 0 ? 'Starting from' : 'Price per person'}
        </p>
        <p className="text-5xl font-serif font-light text-dark dark:text-white transition-colors">
          ${minPrice?.toLocaleString()}
        </p>
        {selectedDate && activePrice !== minPrice && (
          <p className="text-accent text-sm font-bold mt-2">
            Selected: ${activePrice?.toLocaleString()} / person
          </p>
        )}
        <p className="text-gray/50 dark:text-gray/50 text-[10px] tracking-widest uppercase mt-2">
          Per Person / Bespoke Pricing
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-[10px] tracking-[0.2em] uppercase font-bold mb-4 text-center text-primary dark:text-secondary">
          {dates && dates.length > 0 ? 'Select Travel Dates' : 'Choose Your Travel Date'}
        </label>

        <SmartPackageCalendar
          availableDates={dates || []}
          onSelect={handleDateSelect}
          selectedDate={selectedDate}
        />

        {selectedDate && (
          <p className="text-center text-xs text-accent mt-4 font-bold border rounded-lg py-2 border-accent/20">
            Selected:{' '}
            {selectedDate.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      <button
        onClick={handleBooking}
        className="w-full py-5 bg-accent text-white text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary transition-all duration-500 shadow-xl"
      >
        {selectedDate
          ? 'Book Now'
          : dates && dates.length > 0
            ? 'Select a Date First'
            : 'Choose a Date to Book'}
      </button>

      <p className="text-gray/40 dark:text-gray/40 text-[10px] text-center mt-6 tracking-wide transition-colors">
        Our travel designers will connect with you within 24 hours to refine your journey.
      </p>
    </div>
  )
}
