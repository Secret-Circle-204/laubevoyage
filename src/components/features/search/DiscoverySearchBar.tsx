'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLoadingNavigation } from '@/application/loading/use-loading-navigation'
import { useTheme } from '@/providers/theme-provider'
import type { DestinationOptionDTO, BudgetPresetsDTO } from '@/application/experience/dto'
import type { ParsedExperienceSearchParams } from '@/application/shared/parsers/experience-search-parser'

export interface DiscoverySearchBarProps {
  destinations?: DestinationOptionDTO
  initialFilters?: ParsedExperienceSearchParams
  budgetPresets: BudgetPresetsDTO
  variant?: 'hero' | 'catalog'
  className?: string
}

type ActivePopover = 'none' | 'country' | 'city' | 'date' | 'type'

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

export function DiscoverySearchBar({
  destinations = { countries: [], cities: [] },
  initialFilters,
  budgetPresets,
  variant = 'hero',
  className = '',
}: DiscoverySearchBarProps) {
  const router = useRouter()
  const loadingNav = useLoadingNavigation()
  const { theme } = useTheme()
  const isDark = theme === 'dark' || variant === 'hero'

  const containerRef = useRef<HTMLDivElement>(null)

  const [prevFilters, setPrevFilters] = useState(initialFilters)
  const [keyword, setKeyword] = useState(initialFilters?.query || '')
  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    initialFilters?.countryId ? String(initialFilters.countryId) : ''
  )
  const [selectedCityId, setSelectedCityId] = useState<string>(
    initialFilters?.cityId ? String(initialFilters.cityId) : ''
  )
  const [selectedType, setSelectedType] = useState<string>(initialFilters?.type || '')
  const [selectedDate, setSelectedDate] = useState<string>(initialFilters?.date || '')
  const [minPrice, setMinPrice] = useState<string>(
    initialFilters?.minPrice !== undefined ? String(initialFilters.minPrice) : ''
  )
  const [maxPrice, setMaxPrice] = useState<string>(
    initialFilters?.maxPrice !== undefined ? String(initialFilters.maxPrice) : ''
  )
  const [selectedDuration, setSelectedDuration] = useState<string>(
    initialFilters?.duration !== undefined ? String(initialFilters.duration) : ''
  )
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [activePopover, setActivePopover] = useState<ActivePopover>('none')
  const [countryFilterText, setCountryFilterText] = useState('')
  const [cityFilterText, setCityFilterText] = useState('')

  // Adjust local form state during render if initialFilters prop changes
  if (initialFilters !== prevFilters) {
    setPrevFilters(initialFilters)
    setKeyword(initialFilters?.query || '')
    setSelectedCountryId(initialFilters?.countryId ? String(initialFilters.countryId) : '')
    setSelectedCityId(initialFilters?.cityId ? String(initialFilters.cityId) : '')
    setSelectedType(initialFilters?.type || '')
    setSelectedDate(initialFilters?.date || '')
    setMinPrice(initialFilters?.minPrice !== undefined ? String(initialFilters.minPrice) : '')
    setMaxPrice(initialFilters?.maxPrice !== undefined ? String(initialFilters.maxPrice) : '')
    setSelectedDuration(
      initialFilters?.duration !== undefined ? String(initialFilters.duration) : ''
    )
  }

  // Handle outside clicks and Escape key to collapse popovers and sheets
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopover('none')
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover('none')
        setIsMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleGlobalClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Filter cities by selected country if one is chosen
  const filteredCities = selectedCountryId
    ? destinations.cities.filter((c) => c.countryId === Number(selectedCountryId))
    : destinations.cities

  const handleCountryChange = (countryIdStr: string) => {
    setSelectedCountryId(countryIdStr)
    if (countryIdStr) {
      const cityMatches = destinations.cities.some(
        (c) => c.countryId === Number(countryIdStr) && String(c.id) === selectedCityId
      )
      if (!cityMatches) setSelectedCityId('')
    }
  }

  const handleCityChange = (cityIdStr: string) => {
    setSelectedCityId(cityIdStr)
    if (cityIdStr) {
      const cityObj = destinations.cities.find((c) => String(c.id) === cityIdStr)
      if (cityObj && cityObj.countryId) {
        setSelectedCountryId(String(cityObj.countryId))
      }
    }
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setActivePopover('none')
    const params = new URLSearchParams()

    if (keyword.trim()) params.set('q', keyword.trim())
    if (selectedCountryId) params.set('countryId', selectedCountryId)
    if (selectedCityId) params.set('cityId', selectedCityId)
    if (selectedType && selectedType !== 'all') params.set('type', selectedType)
    if (selectedDate) params.set('date', selectedDate)
    if (minPrice && !isNaN(Number(minPrice))) params.set('minPrice', minPrice)
    if (maxPrice && !isNaN(Number(maxPrice))) params.set('maxPrice', maxPrice)
    if (selectedDuration && !isNaN(Number(selectedDuration))) params.set('duration', selectedDuration)

    const queryStr = params.toString()
    loadingNav.push(queryStr ? `/experiences?${queryStr}` : '/experiences')
  }

  const handleResetFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setSelectedDuration('')
  }

  // Display labels helpers
  const selectedCountryObj = destinations.countries.find((c) => String(c.id) === selectedCountryId)
  const selectedCityObj = destinations.cities.find((c) => String(c.id) === selectedCityId)

  const selectedTypeName =
    selectedType === 'package'
      ? 'Tour Packages'
      : selectedType === 'daily_tour'
      ? 'Daily Excursions'
      : 'All Experiences'

  const activeFilterCount =
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (selectedDuration ? 1 : 0)

  // Filtered lists for instant search inside popovers
  const displayedCountries = destinations.countries.filter((c) =>
    c.name.toLowerCase().includes(countryFilterText.toLowerCase().trim())
  )

  const displayedCities = filteredCities.filter((c) =>
    c.name.toLowerCase().includes(cityFilterText.toLowerCase().trim())
  )

  // Spatial Recomposition Segment Styling
  const getSegmentClass = (popoverType: ActivePopover) => {
    const isActive = activePopover === popoverType
    const isAnyActive = activePopover !== 'none'
    if (variant === 'hero') {
      return `relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group text-left ${
        isActive
          ? 'bg-white/[0.16] border-secondary ring-2 ring-secondary/35 shadow-xl shadow-black/50 z-30 scale-[1.015]'
          : isAnyActive
          ? 'bg-white/[0.03] opacity-60 hover:opacity-90 hover:bg-white/[0.08] border-white/10 hover:border-secondary/40 scale-[0.99]'
          : 'bg-white/[0.07] hover:bg-white/[0.11] border-white/15 hover:border-secondary/40'
      }`
    }
    return `relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group text-left ${
      isActive
        ? 'bg-card border-secondary ring-2 ring-secondary/25 shadow-lg shadow-secondary/10 z-30 scale-[1.015]'
        : isAnyActive
        ? 'bg-card/70 opacity-70 hover:opacity-100 hover:bg-card border-border/60 hover:border-secondary/40 scale-[0.99]'
        : 'bg-card hover:bg-card-elevated border-border/80 hover:border-secondary/40 shadow-xs'
    }`
  }

  return (
    <div ref={containerRef} className={`w-full relative ${activePopover !== 'none' ? 'z-50' : 'z-20'} ${className}`}>
      {/* Main Luxury Travel Command Capsule */}
      <div
        className={`rounded-2xl transition-all duration-500 relative ${
          activePopover !== 'none' ? 'z-50' : 'z-20'
        } ${
          variant === 'hero'
            ? 'bg-neutral-950/92 backdrop-blur-2xl border border-white/20 border-t-white/35 shadow-2xl shadow-black/70 p-4 sm:p-6 text-white'
            : isDark
            ? 'bg-card text-card-foreground border border-border shadow-2xl p-4 sm:p-6'
            : 'bg-white text-foreground border border-border shadow-xl shadow-black/[0.04] p-4 sm:p-6'
        }`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Top Quick Keyword Bar with Cyan Focus Pulse */}
          <div className="relative flex items-center group">
            <div className="absolute left-4 text-accent transition-transform duration-300 group-focus-within:scale-110 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search destinations, bespoke voyages, Nile cruises, royal palaces..."
              className={`w-full pl-11 pr-20 py-3.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 focus:outline-none ${
                variant === 'hero'
                  ? 'bg-white/[0.07] hover:bg-white/[0.1] border border-white/15 text-white placeholder-white/50 focus:border-secondary focus:ring-2 focus:ring-secondary/30'
                  : 'bg-card hover:border-secondary/50 border border-border text-foreground placeholder-muted-foreground focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-xs'
              }`}
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 text-muted-foreground hover:text-accent p-1.5 transition-colors cursor-pointer"
                aria-label="Clear keyword"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <div className="absolute right-4 text-[10px] uppercase font-bold text-muted-foreground/60 border border-muted/30 px-2 py-0.5 rounded-md pointer-events-none hidden sm:block">
                Enter ↵
              </div>
            )}
          </div>

          {/* Primary Interactive Segments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch relative">
            
            {/* 1. Country Segment (2 cols) */}
            <div className={`sm:col-span-1 lg:col-span-2 relative ${activePopover === 'country' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'country' ? 'none' : 'country')}
                className={`w-full h-full ${getSegmentClass('country')}`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75 flex items-center gap-1.5">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                        activePopover === 'country' ? 'text-accent' : 'text-muted-foreground group-hover:text-secondary'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18m1-18a17 17 0 010 18" />
                    </svg>
                    <span>Country</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      activePopover === 'country'
                        ? 'rotate-180 text-accent'
                        : 'text-muted-foreground group-hover:text-secondary'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate mt-1 text-foreground dark:text-white">
                  {selectedCountryObj ? selectedCountryObj.name : 'All Countries'}
                </div>

                {/* Orange Active Trace */}
                {activePopover === 'country' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent rounded-full pointer-events-none animate-pulse" />
                )}
              </button>

              {/* Desktop Floating Command Surface (Solid Opaque - Zero Bleed-Through) */}
              {activePopover === 'country' && (
                <div className="hidden sm:block absolute top-full left-0 mt-2.5 z-[60] w-72 sm:w-80 rounded-2xl bg-[#141212] dark:bg-card border border-white/20 dark:border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-3.5 text-white dropdown-emergence">
                  <div className="p-2 border-b border-white/10 dark:border-border/60 mb-2">
                    <input
                      type="text"
                      value={countryFilterText}
                      onChange={(e) => setCountryFilterText(e.target.value)}
                      placeholder="Filter countries..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/10 dark:bg-card border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        handleCountryChange('')
                        setActivePopover('none')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        !selectedCountryId
                          ? 'bg-accent/20 text-accent font-bold border border-accent/30 shadow-sm'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>All Countries</span>
                      {!selectedCountryId && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </button>
                    {displayedCountries.map((country) => (
                      <button
                        key={country.id}
                        type="button"
                        onClick={() => {
                          handleCountryChange(String(country.id))
                          setActivePopover('city') // Auto-advance to city
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                          selectedCountryId === String(country.id)
                            ? 'bg-accent/20 text-accent font-bold border border-accent/30 shadow-sm'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{country.name}</span>
                        {selectedCountryId === String(country.id) && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. City Segment (2 cols) */}
            <div className={`sm:col-span-1 lg:col-span-2 relative ${activePopover === 'city' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'city' ? 'none' : 'city')}
                className={`w-full h-full ${getSegmentClass('city')}`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75 flex items-center gap-1.5">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                        activePopover === 'city' ? 'text-accent' : 'text-muted-foreground group-hover:text-secondary'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>City</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      activePopover === 'city'
                        ? 'rotate-180 text-accent'
                        : 'text-muted-foreground group-hover:text-secondary'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate mt-1 text-foreground dark:text-white">
                  {selectedCityObj ? selectedCityObj.name : selectedCountryId ? 'All in Country' : 'All Cities'}
                </div>

                {/* Orange Active Trace */}
                {activePopover === 'city' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent rounded-full pointer-events-none animate-pulse" />
                )}
              </button>

              {/* Desktop Floating Command Surface (Solid Opaque) */}
              {activePopover === 'city' && (
                <div className="hidden sm:block absolute top-full left-0 mt-2.5 z-[60] w-72 sm:w-80 rounded-2xl bg-[#141212] dark:bg-card border border-white/20 dark:border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-3.5 text-white dropdown-emergence">
                  <div className="p-2 border-b border-white/10 dark:border-border/60 mb-2">
                    <input
                      type="text"
                      value={cityFilterText}
                      onChange={(e) => setCityFilterText(e.target.value)}
                      placeholder="Filter cities..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/10 dark:bg-card border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        handleCityChange('')
                        setActivePopover('none')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        !selectedCityId
                          ? 'bg-accent/20 text-accent font-bold border border-accent/30 shadow-sm'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{selectedCountryId ? 'All Cities in Country' : 'All Cities'}</span>
                      {!selectedCityId && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </button>
                    {displayedCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => {
                          handleCityChange(String(city.id))
                          setActivePopover('none')
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                          selectedCityId === String(city.id)
                            ? 'bg-accent/20 text-accent font-bold border border-accent/30 shadow-sm'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{city.name}</span>
                        {selectedCityId === String(city.id) && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Departure Segment (2 cols) */}
            <div className={`sm:col-span-1 lg:col-span-2 relative ${activePopover === 'date' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'date' ? 'none' : 'date')}
                className={`w-full h-full ${getSegmentClass('date')}`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75 flex items-center gap-1.5">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                        activePopover === 'date' ? 'text-accent' : 'text-muted-foreground group-hover:text-secondary'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>Departure</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      activePopover === 'date'
                        ? 'rotate-180 text-accent'
                        : 'text-muted-foreground group-hover:text-secondary'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate mt-1 text-foreground dark:text-white">
                  {selectedDate ? selectedDate : 'Flexible Dates'}
                </div>

                {/* Orange Active Trace */}
                {activePopover === 'date' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent rounded-full pointer-events-none animate-pulse" />
                )}
              </button>

              {/* Desktop Floating Command Surface (Solid Opaque) */}
              {activePopover === 'date' && (
                <div className="hidden sm:block absolute top-full left-0 sm:left-auto sm:right-0 lg:left-0 mt-2.5 z-[60] w-72 sm:w-80 rounded-2xl bg-[#141212] dark:bg-card border border-white/20 dark:border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-4 text-white dropdown-emergence">
                  <div className="mb-3">
                    <span className="text-[10px] uppercase font-bold text-accent block mb-2">
                      Specific Departure Date
                    </span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value)
                        setActivePopover('none')
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/10 dark:bg-card border border-white/15 text-white [color-scheme:dark] focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                      Quick Seasons
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate('')
                          setActivePopover('none')
                        }}
                        className={`px-3 py-2 text-xs rounded-xl border transition-all text-center ${
                          !selectedDate
                            ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                            : 'border-white/10 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        Anytime
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 14)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-white/10 hover:border-secondary hover:bg-secondary/10 hover:text-secondary transition-all text-center text-white/80"
                      >
                        In 2 Weeks
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 30)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-white/10 hover:border-secondary hover:bg-secondary/10 hover:text-secondary transition-all text-center text-white/80"
                      >
                        Next Month
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 90)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-white/10 hover:border-secondary hover:bg-secondary/10 hover:text-secondary transition-all text-center text-white/80"
                      >
                        In 3 Months
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Experience Type Segment (2 cols) */}
            <div className={`sm:col-span-1 lg:col-span-2 relative ${activePopover === 'type' ? 'z-50' : 'z-20'}`}>
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'type' ? 'none' : 'type')}
                className={`w-full h-full ${getSegmentClass('type')}`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75 flex items-center gap-1.5">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                        activePopover === 'type' ? 'text-accent' : 'text-muted-foreground group-hover:text-secondary'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 9.192-9.192 3.536 3.536-9.192 9.192-3.536z" />
                    </svg>
                    <span>Experience</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      activePopover === 'type'
                        ? 'rotate-180 text-accent'
                        : 'text-muted-foreground group-hover:text-secondary'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate mt-1 text-foreground dark:text-white">
                  {selectedTypeName}
                </div>

                {/* Orange Active Trace */}
                {activePopover === 'type' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent rounded-full pointer-events-none animate-pulse" />
                )}
              </button>

              {/* Desktop Floating Command Surface (Solid Opaque) */}
              {activePopover === 'type' && (
                <div className="hidden sm:block absolute top-full right-0 lg:left-0 mt-2.5 z-[60] w-72 sm:w-80 rounded-2xl bg-[#141212] dark:bg-card border border-white/20 dark:border-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-3.5 text-white dropdown-emergence space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      !selectedType
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 hover:bg-white/10 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>All Bespoke Experiences</span>
                      {!selectedType && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Explore our full global luxury portfolio
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('package')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      selectedType === 'package'
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 hover:bg-white/10 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Curated Tour Packages</span>
                      {selectedType === 'package' && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Multi-day grand voyages with luxury stays
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('daily_tour')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      selectedType === 'daily_tour'
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 hover:bg-white/10 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Private Daily Excursions</span>
                      {selectedType === 'daily_tour' && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Exclusive single-day expeditions & private guides
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Futuristic Actions (Filters Instrument + Decisive Indigo Brand CTA) (4 cols) */}
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 h-full relative z-20 min-w-0">
              
              {/* Dynamic Filters Console Instrument (Idle: ◌ / Hover: + / Active: 03) */}
              <button
                type="button"
                onClick={() => {
                  setActivePopover('none')
                  setIsMoreOpen(!isMoreOpen)
                }}
                className={`px-3 sm:px-4 py-3.5 rounded-xl text-xs font-bold uppercase border flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer select-none shrink-0 group ${
                  isMoreOpen || activeFilterCount > 0
                    ? 'border-accent bg-accent/20 text-accent shadow-lg shadow-accent/20'
                    : variant === 'hero'
                    ? 'border-white/20 bg-white/10 text-white hover:border-secondary/60 hover:text-secondary hover:bg-white/15'
                    : 'border-border bg-card text-foreground hover:border-secondary/60 hover:text-secondary hover:bg-accent/5'
                }`}
                title="Toggle Advanced Voyage Filters"
              >
                <span className="flex items-center gap-2">
                  <span>Filters</span>
                  {activeFilterCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-accent text-white font-extrabold shadow-sm animate-pulse">
                      {String(activeFilterCount).padStart(2, '0')}
                    </span>
                  ) : isMoreOpen ? (
                    <svg className="w-3.5 h-3.5 text-accent transition-transform duration-300 rotate-180 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {/* Idle: Subtle ring */}
                      <span className="group-hover:hidden text-[11px] text-muted-foreground/80 font-normal leading-none">○</span>
                      {/* Hover: Moving Cyan Plus */}
                      <span className="hidden group-hover:inline-block text-xs font-bold text-secondary transition-transform group-hover:rotate-90 duration-200">+</span>
                    </span>
                  )}
                </span>
              </button>

              {/* Decisive Indigo Brand Submission Button (Authority + Decisive Action) */}
              <button
                type="submit"
                className="flex-1 min-w-0 py-3.5 px-3 sm:px-5 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-extrabold uppercase rounded-xl transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 hover-lift active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer select-none border border-primary-light/30 group"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="truncate">Explore</span>
              </button>
            </div>
          </div>

          {/* Refine Your Journey - Intelligent Expandable Filters Console */}
          {isMoreOpen && (
            <div className={`pt-6 mt-3 border-t ${variant === 'hero' ? 'border-white/15' : 'border-border'} space-y-4 soft-reveal`}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-accent">
                  Refine Your Journey
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] uppercase text-muted-foreground hover:text-accent transition-colors font-semibold cursor-pointer underline underline-offset-4"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Min Price */}
                <div className="p-3.5 rounded-xl border border-white/15 dark:border-border bg-white/[0.05] dark:bg-card-elevated transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75">
                      Minimum Budget
                    </span>
                    <span className="text-[9px] font-extrabold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                      {budgetPresets.currencyCode}
                    </span>
                  </div>
                  {/* Curated Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {budgetPresets.minPresets.map((preset) => {
                      const isSelected = minPrice === String(preset.egpValue)
                      return (
                        <button
                          key={preset.egpValue}
                          type="button"
                          onClick={() => setMinPrice(isSelected ? '' : String(preset.egpValue))}
                          className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                              : 'border-white/10 dark:border-border hover:border-secondary hover:text-secondary text-muted-foreground'
                          }`}
                        >
                          {preset.displayLabel}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Max Price */}
                <div className="p-3.5 rounded-xl border border-white/15 dark:border-border bg-white/[0.05] dark:bg-card-elevated transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75">
                      Maximum Budget
                    </span>
                    <span className="text-[9px] font-extrabold text-accent uppercase bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                      {budgetPresets.currencyCode}
                    </span>
                  </div>
                  {/* Curated Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {budgetPresets.maxPresets.map((preset) => {
                      const isSelected = maxPrice === String(preset.egpValue)
                      return (
                        <button
                          key={preset.egpValue}
                          type="button"
                          onClick={() => setMaxPrice(isSelected ? '' : String(preset.egpValue))}
                          className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                              : 'border-white/10 dark:border-border hover:border-secondary hover:text-secondary text-muted-foreground'
                          }`}
                        >
                          {preset.displayLabel}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Duration Pills */}
                <div className="p-3.5 rounded-xl border border-white/15 dark:border-border bg-white/[0.05] dark:bg-card-elevated transition-all">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground dark:text-white/75 flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Voyage Duration</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { val: '', lbl: 'Any' },
                      { val: '1', lbl: '1 Day' },
                      { val: '3', lbl: '3+ Days' },
                      { val: '5', lbl: '5+ Days' },
                      { val: '7', lbl: '7+ Days' },
                      { val: '10', lbl: '10+ Days' },
                    ].map((dur) => (
                      <button
                        key={dur.val}
                        type="button"
                        onClick={() => setSelectedDuration(dur.val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          selectedDuration === dur.val
                            ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                            : 'border-white/10 dark:border-border hover:border-secondary/40 text-muted-foreground'
                        }`}
                      >
                        {dur.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Mobile Luxury Bottom Sheet Surface (Screens < 640px) */}
      {activePopover !== 'none' && (
        <div className="sm:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setActivePopover('none')}
          />

          {/* Sheet Surface */}
          <div className="relative z-10 w-full max-h-[85vh] bg-[#141212] dark:bg-card border-t border-white/20 rounded-t-3xl p-5 shadow-2xl flex flex-col dropdown-emergence text-white">
            {/* Grab handle */}
            <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-3.5 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-accent block">
                  {activePopover === 'country' && 'Select Country'}
                  {activePopover === 'city' && 'Select City'}
                  {activePopover === 'date' && 'Departure Date'}
                  {activePopover === 'type' && 'Experience Type'}
                </span>
                <span className="text-xs text-white/60 font-light">
                  {activePopover === 'country' && 'Bespoke destinations worldwide'}
                  {activePopover === 'city' && 'Curated urban & cultural centers'}
                  {activePopover === 'date' && 'Flexible timing & seasonal departures'}
                  {activePopover === 'type' && 'Tour packages or private excursions'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover('none')}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sheet Scrollable Content */}
            <div className="overflow-y-auto max-h-[60vh] space-y-2 pr-1 custom-scrollbar">
              {activePopover === 'country' && (
                <>
                  <div className="p-1 mb-2">
                    <input
                      type="text"
                      value={countryFilterText}
                      onChange={(e) => setCountryFilterText(e.target.value)}
                      placeholder="Filter countries..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/10 dark:bg-card border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-secondary"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCountryChange('')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                      !selectedCountryId
                        ? 'bg-accent/20 text-accent font-bold border border-accent/30'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>All Countries</span>
                    {!selectedCountryId && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                  </button>
                  {displayedCountries.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => {
                        handleCountryChange(String(country.id))
                        setActivePopover('city')
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                        selectedCountryId === String(country.id)
                          ? 'bg-accent/20 text-accent font-bold border border-accent/30'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{country.name}</span>
                      {selectedCountryId === String(country.id) && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </>
              )}

              {activePopover === 'city' && (
                <>
                  <div className="p-1 mb-2">
                    <input
                      type="text"
                      value={cityFilterText}
                      onChange={(e) => setCityFilterText(e.target.value)}
                      placeholder="Filter cities..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/10 dark:bg-card border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-secondary"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCityChange('')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                      !selectedCityId
                        ? 'bg-accent/20 text-accent font-bold border border-accent/30'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{selectedCountryId ? 'All Cities in Country' : 'All Cities'}</span>
                    {!selectedCityId && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                  </button>
                  {displayedCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        handleCityChange(String(city.id))
                        setActivePopover('none')
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                        selectedCityId === String(city.id)
                          ? 'bg-accent/20 text-accent font-bold border border-accent/30'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{city.name}</span>
                      {selectedCityId === String(city.id) && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </>
              )}

              {activePopover === 'date' && (
                <div className="p-2 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-accent block mb-2">
                      Specific Departure Date
                    </span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value)
                        setActivePopover('none')
                      }}
                      className="w-full px-3.5 py-3 text-xs rounded-xl bg-white/10 dark:bg-card border border-white/15 text-white [color-scheme:dark] focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                      Quick Seasons
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate('')
                          setActivePopover('none')
                        }}
                        className={`px-3 py-2.5 text-xs rounded-xl border transition-all text-center ${
                          !selectedDate
                            ? 'border-accent bg-accent/20 text-accent font-bold'
                            : 'border-white/10 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        Anytime
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 14)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2.5 text-xs rounded-xl border border-white/10 hover:border-secondary hover:text-secondary text-white/80"
                      >
                        In 2 Weeks
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 30)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2.5 text-xs rounded-xl border border-white/10 hover:border-secondary hover:text-secondary text-white/80"
                      >
                        Next Month
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date()
                          now.setDate(now.getDate() + 90)
                          setSelectedDate(now.toISOString().split('T')[0])
                          setActivePopover('none')
                        }}
                        className="px-3 py-2.5 text-xs rounded-xl border border-white/10 hover:border-secondary hover:text-secondary text-white/80"
                      >
                        In 3 Months
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activePopover === 'type' && (
                <div className="p-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      !selectedType
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>All Bespoke Experiences</span>
                      {!selectedType && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Explore our full global luxury portfolio
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('package')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      selectedType === 'package'
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Curated Tour Packages</span>
                      {selectedType === 'package' && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Multi-day grand voyages with luxury stays
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('daily_tour')
                      setActivePopover('none')
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-0.5 ${
                      selectedType === 'daily_tour'
                        ? 'border-accent bg-accent/20 text-accent font-bold shadow-sm'
                        : 'border-white/10 hover:border-secondary/50 text-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Private Daily Excursions</span>
                      {selectedType === 'daily_tour' && <CheckIcon className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Exclusive single-day expeditions & private guides
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
