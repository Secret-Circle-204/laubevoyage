'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Users, CreditCard } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createBookingAction } from './bookingActions'
import { SmartPackageCalendar } from '@/components/premium-ui/SmartPackageCalendar'
import type { DateRange } from '@/components/premium-ui/SmartPackageCalendar'
import { PointsRedemption } from '@/components/booking/PointsRedemption'

interface Traveler {
  fullName: string
  type: 'adult' | 'infant'
  passportNumber: string
  specialRequests: string
}

import type { Destination, Package, User, Excursion } from '@/payload-types'

interface BookingFormProps {
  destinations: Destination[]
  packages: Package[]
  user?: User | null
  excursions: Excursion[]
}

export default function BookingForm({
  destinations,
  packages,
  user,
  excursions,
}: BookingFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedDestination, setSelectedDestination] = useState<string>(
    searchParams.get('destination') || '',
  )
  const [selectedPackage, setSelectedPackage] = useState<string>(searchParams.get('package') || '')
  const [guestCount, setGuestCount] = useState(2)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null)
  const [step, setStep] = useState(1)

  // New state for detailed data
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '' })
  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [selectedExcursions, setSelectedExcursions] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Points redemption state
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [pointsDiscount, setPointsDiscount] = useState(0)

  // Sync travelers array with guest count
  useEffect(() => {
    setTravelers((prev) => {
      const newTravelers = [...prev]
      if (newTravelers.length < guestCount) {
        for (let i = newTravelers.length; i < guestCount; i++) {
          newTravelers.push({
            fullName: '',
            type: 'adult',
            passportNumber: '',
            specialRequests: '',
          })
        }
      } else if (newTravelers.length > guestCount) {
        return newTravelers.slice(0, guestCount)
      }
      return newTravelers
    })
  }, [guestCount])

  // Auto-fill user contact info
  useEffect(() => {
    if (user) {
      setContactInfo({
        email: user.email || '',
        phone: '', // User type doesn't have phone field
      })
    }
  }, [user])

  // Pre-select excursion from URL search params
  useEffect(() => {
    const excursionId = searchParams.get('excursion')
    if (excursionId) {
      const idNum = parseInt(excursionId, 10)
      if (!isNaN(idNum)) {
        setSelectedExcursions((prev) => {
          if (!prev.includes(idNum)) {
            return [...prev, idNum]
          }
          return prev
        })
      }
    }
  }, [searchParams])

  // Auto-select package if destination changes and has only one package
  useEffect(() => {
    if (selectedDestination) {
      const relPackages = packages.filter((pkg) => {
        if (!pkg.relatedDestination) return false
        const pkgDestId =
          typeof pkg.relatedDestination === 'object'
            ? pkg.relatedDestination.id
            : pkg.relatedDestination
        return String(pkgDestId) === String(selectedDestination)
      })
      if (relPackages.length === 1 && !selectedPackage) {
        setSelectedPackage(String(relPackages[0].id))
      }
    }
  }, [selectedDestination, packages, selectedPackage])

  const _daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const _firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const _nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const _prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))

  const selectedPkgData = packages.find((pkg) => String(pkg.id) === String(selectedPackage))
  const selectedDestData = destinations.find(
    (dest) => String(dest.id) === String(selectedDestination),
  )

  // Filter excursions for the selected destination
  const availableExcursions = excursions.filter((ex) => {
    if (!ex.relatedDestination) return false
    const exDestId =
      typeof ex.relatedDestination === 'object' ? ex.relatedDestination.id : ex.relatedDestination
    return String(exDestId) === String(selectedDestination)
  })

  const adultPricePerPerson = selectedDateRange?.adultPrice ?? selectedPkgData?.adultPrice ?? 0
  const infantPricePerPerson = selectedDateRange?.infantPrice ?? selectedPkgData?.infantPrice ?? 0

  const adultCount = travelers.filter((t) => t.type === 'adult').length
  const infantCount = travelers.filter((t) => t.type === 'infant').length

  const excursionsTotal = selectedExcursions.reduce((acc, id) => {
    const ex = excursions.find((e) => String(e.id) === String(id))
    return acc + (ex?.price || 0)
  }, 0)

  const subtotal =
    adultPricePerPerson * adultCount + infantPricePerPerson * infantCount + excursionsTotal
  const totalPrice = Math.max(0, subtotal - pointsDiscount)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Left Column: Logic & Selection */}
      <div className="lg:col-span-8 space-y-12">
        {/* Step 1: Destination & Package */}
        <div
          className={`p-8 rounded-3xl border transition-all duration-500 ${step === 1 ? 'border-accent bg-white dark:bg-gray/5 shadow-2xl scale-[1.02]' : 'border-gray/10 opacity-60'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-accent text-white' : 'bg-gray/20 text-gray'}`}
            >
              1
            </div>
            <h2 className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
              Select Your Journey
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-3 text-secondary">
                Destination
              </label>
              <select
                value={selectedDestination}
                onChange={(e) => {
                  setSelectedDestination(e.target.value)
                  setSelectedPackage('')
                }}
                className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none font-medium transition-colors ${isDark ? 'text-white bg-dark' : 'text-dark bg-white'}`}
              >
                <option value="" className={isDark ? 'bg-dark text-white' : 'bg-white text-dark'}>
                  Where to?
                </option>
                {destinations.map((dest) => (
                  <option
                    key={dest.id}
                    value={dest.id}
                    className={isDark ? 'bg-dark text-white' : 'bg-white text-dark'}
                  >
                    {dest.name} {dest.name.includes(dest.country) ? '' : `(${dest.country})`}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence mode="wait">
              {selectedDestination && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <label className="block text-xs uppercase tracking-widest font-bold mb-3 text-secondary">
                    Travel Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none font-medium transition-colors ${isDark ? 'text-white bg-dark' : 'text-dark bg-white'}`}
                  >
                    <option
                      value=""
                      className={isDark ? 'bg-dark text-white' : 'bg-white text-dark'}
                    >
                      Select Package
                    </option>
                    {packages
                      .filter((pkg) => {
                        if (!pkg.relatedDestination) return false
                        const pkgDestId =
                          typeof pkg.relatedDestination === 'object'
                            ? pkg.relatedDestination.id
                            : pkg.relatedDestination
                        return String(pkgDestId) === String(selectedDestination)
                      })
                      .map((pkg) => (
                        <option
                          key={pkg.id}
                          value={pkg.id}
                          className={isDark ? 'bg-dark text-white' : 'bg-white text-dark'}
                        >
                          {pkg.title}
                        </option>
                      ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {selectedPackage && step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="mt-8 px-8 py-3 bg-accent text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-primary transition-all shadow-lg active:scale-95"
            >
              Continue to Dates
            </button>
          )}
        </div>

        {/* Step 2: Date & Guests */}
        <div
          className={`p-8 rounded-3xl border transition-all duration-500 ${step === 2 ? 'border-secondary bg-white dark:bg-gray/5 shadow-2xl scale-[1.02]' : 'border-gray/10 opacity-60'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-secondary text-white' : 'bg-gray/20 text-gray'}`}
            >
              2
            </div>
            <h2 className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
              When & How Many?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Calendar UI */}
            <div>
              <SmartPackageCalendar
                availableDates={selectedPkgData?.dates || []}
                selectedDate={selectedDate}
                onSelect={(date, dateRange) => {
                  setSelectedDate(date)
                  setSelectedDateRange(dateRange || null)
                }}
              />
            </div>

            {/* Guests Selection */}
            <div className="space-y-8">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-4 text-secondary">
                  Number of Guests
                </label>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className={`w-12 h-12 rounded-full border border-gray/20 flex items-center justify-center transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-dark hover:bg-dark/5'}`}
                  >
                    -
                  </button>
                  <span className={`text-3xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
                    {guestCount}
                  </span>
                  <button
                    onClick={() => setGuestCount(guestCount + 1)}
                    className={`w-12 h-12 rounded-full border border-gray/20 flex items-center justify-center transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-dark hover:bg-dark/5'}`}
                  >
                    +
                  </button>
                </div>
              </div>

              {selectedDate && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-4 bg-secondary text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-accent transition-all shadow-xl active:scale-95"
                >
                  Continue to Guest Details
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Guest Details & Contact */}
        <div
          className={`p-8 rounded-3xl border transition-all duration-500 ${step === 3 ? 'border-primary bg-white dark:bg-gray/5 shadow-2xl scale-[1.02]' : 'border-gray/10 opacity-60'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 3 ? 'bg-primary text-white' : 'bg-gray/20 text-gray'}`}
            >
              3
            </div>
            <h2 className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
              Guest Details
            </h2>
          </div>

          <div className="space-y-10">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray/5 border border-gray/10">
              <div className="md:col-span-2 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                Primary Contact
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white' : 'text-dark'}`}
                  placeholder="traveler@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white' : 'text-dark'}`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {/* Individual Travelers */}
            <div className="space-y-6">
              {travelers.map((traveler, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-gray/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Users size={16} className="text-secondary" />
                    <span className="text-sm font-serif">
                      Guest {idx + 1} ({traveler.type})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                        Full Name (As per Passport)
                      </label>
                      <input
                        type="text"
                        value={traveler.fullName}
                        onChange={(e) => {
                          const newTravelers = [...travelers]
                          newTravelers[idx].fullName = e.target.value
                          setTravelers(newTravelers)
                        }}
                        className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white' : 'text-dark'}`}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        value={traveler.passportNumber}
                        onChange={(e) => {
                          const newTravelers = [...travelers]
                          newTravelers[idx].passportNumber = e.target.value
                          setTravelers(newTravelers)
                        }}
                        className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white' : 'text-dark'}`}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                        Traveler Type
                      </label>
                      <select
                        value={traveler.type}
                        onChange={(e) => {
                          const newTravelers = [...travelers]
                          newTravelers[idx].type = e.target.value as 'adult' | 'infant'
                          setTravelers(newTravelers)
                        }}
                        className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white bg-dark' : 'text-dark bg-white'}`}
                      >
                        <option value="adult">Adult</option>
                        <option value="infant">Infant (Under 2)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 text-gray/60">
                        Special Requests / Preferences
                      </label>
                      <textarea
                        value={traveler.specialRequests}
                        onChange={(e) => {
                          const newTravelers = [...travelers]
                          newTravelers[idx].specialRequests = e.target.value
                          setTravelers(newTravelers)
                        }}
                        className={`w-full p-4 bg-transparent border border-gray/20 rounded-xl focus:border-accent outline-none text-sm ${isDark ? 'text-white' : 'text-dark'} min-h-[100px]`}
                        placeholder="Dietary requirements, medical needs, or special occasions..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {step === 3 && (
              <button
                disabled={
                  !contactInfo.email || !contactInfo.phone || travelers.some((t) => !t.fullName)
                }
                onClick={() => setStep(4)}
                className="w-full py-4 bg-primary text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-accent transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                Continue to Excursions
              </button>
            )}
          </div>
        </div>

        {/* Step 4: Excursion Add-ons */}
        <div
          className={`p-8 rounded-3xl border transition-all duration-500 ${step === 4 ? 'border-accent bg-white dark:bg-gray/5 shadow-2xl scale-[1.02]' : 'border-gray/10 opacity-60'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 4 ? 'bg-accent text-white' : 'bg-gray/20 text-gray'}`}
            >
              4
            </div>
            <h2 className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
              Enhance Your Journey
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-sm text-gray/60 mb-8 font-light italic">
              Curated experiences in {selectedDestData?.name}. Add them now to your itinerary.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableExcursions.length > 0 ? (
                <>
                  <p className="text-xs text-secondary md:col-span-2">
                    Select from our Boutique Collection:
                  </p>
                  {availableExcursions.map((ex) => (
                    <div
                      key={ex.id}
                      className={`p-4 rounded-2xl border transition-colors cursor-pointer ${selectedExcursions.includes(ex.id) ? 'border-accent bg-accent/5' : 'border-gray/10'}`}
                      onClick={() => {
                        setSelectedExcursions((prev) =>
                          prev.includes(ex.id) ? prev.filter((i) => i !== ex.id) : [...prev, ex.id],
                        )
                      }}
                    >
                      <div className="font-serif mb-1">{ex.title}</div>
                      <div className="text-[10px] text-accent uppercase font-bold tracking-widest mb-2">
                        ${ex.price} / Person
                      </div>
                      <p className="text-xs text-gray/60 line-clamp-2 italic leading-relaxed">
                        {typeof ex.description === 'object' && ex.description?.root
                          ? 'Explore detailed activities...'
                          : typeof ex.description === 'string'
                            ? ex.description
                            : 'Explore detailed activities...'}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="md:col-span-2 p-8 border-2 border-dashed border-gray/10 rounded-2xl text-center text-gray/40 italic text-sm">
                  No specific excursions found for this destination. You can continue to finalize.
                </div>
              )}
            </div>

            {step === 4 && (
              <button
                onClick={() => setStep(5)}
                className="w-full py-4 bg-accent text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-primary transition-all shadow-xl mt-8 active:scale-95"
              >
                Finalize My Journey
              </button>
            )}
          </div>
        </div>

        {/* Step 5: Review & Confirm */}
        <div
          className={`p-8 rounded-3xl border transition-all duration-500 ${step === 5 ? 'border-accent bg-white dark:bg-gray/5 shadow-2xl scale-[1.02]' : 'border-gray/10 opacity-60'}`}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 5 ? 'bg-secondary text-white' : 'bg-gray/20 text-gray'}`}
            >
              5
            </div>
            <h2 className={`text-2xl font-serif ${isDark ? 'text-white' : 'text-dark'}`}>
              Review Your Journey
            </h2>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-gray/60 font-bold">
                  Journey Details
                </p>
                <p className={`text-sm ${isDark ? 'text-white/80' : 'text-dark/80'}`}>
                  {selectedPkgData?.title}
                </p>
                <p className={`text-sm ${isDark ? 'text-white/80' : 'text-dark/80'}`}>
                  {selectedDestData?.name}, {selectedDestData?.country}
                </p>
                <p className={`text-sm ${isDark ? 'text-white/80' : 'text-dark/80'}`}>
                  {selectedDate?.toLocaleDateString()} — {guestCount} Guests
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-gray/60 font-bold">
                  Travelers
                </p>
                {travelers.map((t, idx) => (
                  <p key={idx} className={`text-sm ${isDark ? 'text-white/80' : 'text-dark/80'}`}>
                    {t.fullName} ({t.type})
                  </p>
                ))}
              </div>
              <div className="md:col-span-2 space-y-2 border-t border-gray/10 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-gray/60 font-bold">
                  Selected Add-ons
                </p>
                {selectedExcursions.length > 0 ? (
                  selectedExcursions.map((id, idx) => {
                    const ex = excursions.find((e) => String(e.id) === String(id))
                    return (
                      <p
                        key={idx}
                        className={`text-sm ${isDark ? 'text-white/80' : 'text-dark/80'}`}
                      >
                        • {ex?.title || 'Unknown Excursion'}
                      </p>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray/40 italic">No add-ons selected</p>
                )}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl text-xs flex items-start gap-3 ${isDark ? 'bg-secondary/10 text-secondary' : 'bg-secondary/5 text-secondary'}`}
            >
              <CreditCard size={14} className="mt-0.5" />
              <p>
                By finalizing, you agree to our terms of service. Our concierge team will contact
                you within 24 hours to finalize payment and documentation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary (Sticky) */}
      <div className="lg:col-span-4">
        <div
          className={`sticky top-32 rounded-3xl p-8 shadow-2xl transition-colors duration-500 border ${isDark ? 'bg-dark/60 backdrop-blur-xl border-gray/10' : 'bg-white border-gray/10'}`}
        >
          <h3
            className={`text-xl font-serif mb-8 flex items-center gap-3 ${isDark ? 'text-white' : 'text-dark'}`}
          >
            <CreditCard className="text-accent" size={20} />
            Journey Summary
          </h3>

          <div className="space-y-6 mb-8">
            {selectedPkgData ? (
              <div className={`flex gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray/5'}`}>
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={
                      typeof selectedPkgData.heroImage === 'object' &&
                      selectedPkgData.heroImage?.url
                        ? selectedPkgData.heroImage.url
                        : 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'
                    }
                    alt={selectedPkgData.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-accent font-bold mb-1">
                    Package
                  </p>
                  <h4
                    className={`font-serif text-sm leading-tight ${isDark ? 'text-white' : 'text-dark'}`}
                  >
                    {selectedPkgData.title}
                  </h4>
                  <p className="text-gray dark:text-gray/60 text-[10px] mt-1">
                    {selectedDestData?.name}, {selectedDestData?.country}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray/10 rounded-2xl text-gray/40 text-xs text-center px-4">
                Select a package to see your journey details
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray/10">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray/60">
                  <Users size={14} /> <span>Number of Guests</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-dark'}`}>
                  {guestCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray/60">
                  <Calendar size={14} /> <span>Travel Date</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-dark'}`}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '---'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray/10 space-y-4">
            <div className="flex items-center justify-between text-gray/60 text-sm">
              <span>Adults × {adultCount}</span>
              <span className={isDark ? 'text-white/80' : 'text-dark/80'}>
                ${(adultPricePerPerson * adultCount).toLocaleString()}
              </span>
            </div>
            {infantCount > 0 && (
              <div className="flex items-center justify-between text-gray/60 text-sm">
                <span>Infants × {infantCount}</span>
                <span className={isDark ? 'text-white/80' : 'text-dark/80'}>
                  ${(infantPricePerPerson * infantCount).toLocaleString()}
                </span>
              </div>
            )}

            {/* Points Redemption Section */}
            {user && (
              <PointsRedemption
                userPoints={user.loyaltyPoints || 0}
                totalPrice={subtotal}
                onRedemptionChange={(points, discount) => {
                  setPointsToRedeem(points)
                  setPointsDiscount(discount)
                }}
                isDark={isDark}
              />
            )}

            {/* Subtotal and Discount */}
            {pointsDiscount > 0 && (
              <>
                <div className="flex items-center justify-between text-gray/60 text-sm">
                  <span>Subtotal</span>
                  <span className={isDark ? 'text-white/80' : 'text-dark/80'}>
                    ${subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-primary text-sm font-medium">
                  <span>Points Discount</span>
                  <span>-${pointsDiscount.toLocaleString()}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray/10">
              <span className={`font-serif text-lg ${isDark ? 'text-white' : 'text-dark'}`}>
                Total Amount
              </span>
              <span className="text-2xl font-serif text-accent font-bold">
                ${totalPrice.toLocaleString()}
              </span>
            </div>

            <button
              disabled={step < 5 || isSubmitting}
              onClick={async () => {
                if (isSubmitting) return
                setIsSubmitting(true)

                try {
                  const result = await createBookingAction({
                    packageId: selectedPackage,
                    contactEmail: contactInfo.email,
                    contactPhone: contactInfo.phone,
                    bookingDate: selectedDate?.toISOString() || '',
                    travelers: travelers,
                    selectedExcursions: selectedExcursions,
                    totalPrice: totalPrice,
                    pointsToRedeem: pointsToRedeem,
                  })

                  if (result.success) {
                    // Pass points via URL - checkout API will validate on server
                    const points = result.pointsToRedeem ?? 0
                    const url = `/booking/pay?id=${result.bookingId}${points > 0 ? `&points=${points}` : ''}`
                    router.push(url)
                  } else {
                    alert(result.error || 'Something went wrong')
                  }
                } catch (_error) {
                  alert('A connection error occurred. Please try again.')
                } finally {
                  setIsSubmitting(false)
                }
              }}
              className={`w-full py-5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-xl mt-4 active:scale-95 flex items-center justify-center
                ${step === 5 ? 'bg-accent text-white hover:bg-primary scale-100' : 'bg-gray/10 text-gray/40 scale-95 cursor-not-allowed'}
              `}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Finalize Reservation →'
              )}
            </button>
            <p className="text-[10px] text-center text-gray/40 italic">
              Secure checkout powered by L&apos;Aube Voyage
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
