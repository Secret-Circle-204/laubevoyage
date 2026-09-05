'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/theme-provider'
import type { DestinationOptionDTO } from '@/application/experience/dto'
import type { ParsedExperienceSearchParams } from '@/application/shared/parsers/experience-search-parser'

export interface DiscoverySearchBarProps {
  destinations?: DestinationOptionDTO
  initialFilters?: ParsedExperienceSearchParams
  variant?: 'hero' | 'catalog'
  className?: string
}

export function DiscoverySearchBar({
  destinations = { countries: [], cities: [] },
  initialFilters,
  variant = 'catalog',
  className = '',
}: DiscoverySearchBarProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark' || variant === 'hero'

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

  // Adjust local form state during render if initialFilters prop changes (React recommended pattern)
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
    router.push(queryStr ? `/experiences?${queryStr}` : '/experiences')
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Main Search Container */}
      <div
        className={`rounded-2xl transition-all duration-300 ${
          variant === 'hero'
            ? 'bg-neutral-950/80 backdrop-blur-xl border border-white/20 shadow-2xl p-4 sm:p-6 text-white'
            : isDark
            ? 'bg-neutral-900/90 backdrop-blur-md border border-neutral-800 shadow-xl p-4 sm:p-6 text-white'
            : 'bg-white border border-slate-200 shadow-xl p-4 sm:p-6 text-slate-900'
        }`}
      >
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Top Quick Keyword Row */}
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by keyword, tour title, or destination (e.g. Cairo, Hurghada, Nile Cruise)..."
              className={`w-full pl-12 pr-10 py-3 text-sm rounded-xl transition-all focus:outline-none ${
                isDark
                  ? 'bg-white/10 border border-white/10 text-white placeholder-neutral-400 focus:border-[#f58220]'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#f58220]'
              }`}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 text-slate-400 hover:text-slate-200 p-1"
                aria-label="Clear keyword"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Primary Discovery Grid (Where, When, What, More) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* 1. WHERE: Destination Selectors */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#f58220] flex items-center gap-1">
                <span>🌍</span> Where
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={selectedCountryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={`w-full text-xs bg-transparent focus:outline-none cursor-pointer truncate ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}
                  aria-label="Select Country"
                >
                  <option value="" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                    All Countries
                  </option>
                  {destinations.countries.map((country) => (
                    <option
                      key={country.id}
                      value={country.id}
                      className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}
                    >
                      {country.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className={`w-full text-xs bg-transparent focus:outline-none cursor-pointer truncate ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}
                  aria-label="Select City"
                >
                  <option value="" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                    All Cities
                  </option>
                  {filteredCities.map((city) => (
                    <option
                      key={city.id}
                      value={city.id}
                      className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. WHEN: Departure Date */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#00aeef] flex items-center gap-1">
                <span>📅</span> When (Departure)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full text-xs bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'text-white [color-scheme:dark]' : 'text-slate-800'
                }`}
              />
            </div>

            {/* 3. WHAT: Tour Type */}
            <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#2e3192] dark:text-[#00aeef] flex items-center gap-1">
                <span>🧭</span> What (Tour Type)
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={`w-full text-xs bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'text-white' : 'text-slate-800'
                }`}
                aria-label="Select Tour Type"
              >
                <option value="" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                  All Experiences
                </option>
                <option value="package" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                  Tour Packages
                </option>
                <option value="daily_tour" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                  Daily Tours
                </option>
              </select>
            </div>

            {/* 4. Action & More Filters Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`px-3.5 py-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  isMoreOpen || Boolean(minPrice || maxPrice || selectedDuration)
                    ? 'border-[#f58220] bg-[#f58220]/15 text-[#f58220]'
                    : isDark
                    ? 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Filter by Price & Duration"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>{isMoreOpen ? 'Less' : 'Filters'}</span>
              </button>

              <button
                type="submit"
                className="grow py-3 px-6 bg-[#f58220] hover:bg-[#2e3192] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Explore</span>
              </button>
            </div>
          </div>

          {/* Collapsible More Filters (Price & Duration) */}
          {isMoreOpen && (
            <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Min Price (EGP)
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="e.g. 1000"
                  className={`w-full px-3 py-2 text-xs rounded-lg border ${
                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:border-[#f58220]`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Max Price (EGP)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="e.g. 50000"
                  className={`w-full px-3 py-2 text-xs rounded-lg border ${
                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:border-[#f58220]`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Duration
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border ${
                    isDark ? 'bg-neutral-800 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:border-[#f58220]`}
                >
                  <option value="">Any Duration</option>
                  <option value="1">1 Day</option>
                  <option value="3">3+ Days</option>
                  <option value="5">5+ Days</option>
                  <option value="7">7+ Days</option>
                  <option value="10">10+ Days</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
