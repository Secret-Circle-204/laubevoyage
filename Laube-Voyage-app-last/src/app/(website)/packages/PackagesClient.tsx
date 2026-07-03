'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageCard } from '@/components/premium-ui/PackageCard'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { Package, Destination, City } from '@/payload-types'

interface PackagesClientProps {
  initialPackages: Package[]
  destinations: Destination[]
  cities: City[]
}

export function PackagesClient({ initialPackages, destinations, cities }: PackagesClientProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Helper: get minimum price across dates with fallback
  const getMinPrice = (pkg: Package) => {
    const base = pkg.adultPrice || pkg.price || 0
    if (pkg.dates && pkg.dates.length > 0) {
      const prices = pkg.dates.map((d) => d.adultPrice ?? base).filter((p) => p > 0)
      return prices.length > 0 ? Math.min(...prices) : base
    }
    return base
  }

  // Filter states
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [destinationFilter, setDestinationFilter] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000])
  const [sortBy, setSortBy] = useState<string>('default')

  // Calculate price bounds
  const priceBounds = useMemo(() => {
    const prices = initialPackages.map((p) => getMinPrice(p)).filter((p) => p > 0)
    return {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 50000),
    }
  }, [initialPackages])

  // Filter and sort packages
  const filteredPackages = useMemo(() => {
    let result = initialPackages.filter((pkg) => {
      // City filter
      if (cityFilter !== 'all') {
        const firstCity = Array.isArray(pkg.city) && pkg.city.length > 0 ? pkg.city[0] : null
        const cityId = firstCity
          ? (typeof firstCity === 'object' ? String(firstCity.id) : String(firstCity))
          : ''
        if (cityId !== cityFilter) return false
      }

      // Destination filter
      if (destinationFilter !== 'all') {
        const destId =
          typeof pkg.relatedDestination === 'object' && pkg.relatedDestination
            ? String(pkg.relatedDestination.id)
            : String(pkg.relatedDestination || '')
        if (destId !== destinationFilter) return false
      }

      // Price filter — use min price across dates
      const price = getMinPrice(pkg)
      if (price < priceRange[0] || price > priceRange[1]) return false

      return true
    })

    // Sort
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => getMinPrice(a) - getMinPrice(b))
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => getMinPrice(b) - getMinPrice(a))
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [initialPackages, cityFilter, destinationFilter, priceRange, sortBy])

  const activeFiltersCount = [
    cityFilter !== 'all',
    destinationFilter !== 'all',
    priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max,
  ].filter(Boolean).length

  const resetFilters = () => {
    setCityFilter('all')
    setDestinationFilter('all')
    setPriceRange([priceBounds.min, priceBounds.max])
    setSortBy('default')
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-12 p-6 rounded-2xl border transition-colors duration-500 ${
            isDark ? 'bg-[#1a1718] border-[#A7AAAC]/10' : 'bg-white border-[#231F20]/5 shadow-sm'
          }`}
        >
          {/* Filter Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm tracking-[0.15em] uppercase font-medium ${
                  isDark ? 'text-white' : 'text-[#231F20]'
                }`}
              >
                Filter By
              </span>
              {activeFiltersCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2.5 py-1 bg-[#F58220] text-white text-xs rounded-full"
                >
                  {activeFiltersCount} active
                </motion.span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={resetFilters}
                className={`text-xs tracking-wider uppercase transition-colors ${
                  isDark ? 'text-[#00AEEF] hover:text-white' : 'text-[#2E3192] hover:text-[#231F20]'
                }`}
              >
                Reset All
              </motion.button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* City Filter */}
            <div>
              <label
                className={`block text-xs tracking-wider uppercase mb-2 ${
                  isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
                }`}
              >
                City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg text-sm transition-all duration-300 cursor-pointer ${
                  isDark
                    ? 'bg-[#231F20] border-[#A7AAAC]/20 text-white focus:border-[#00AEEF]'
                    : 'bg-[#FAFAFA] border-[#231F20]/10 text-[#231F20] focus:border-[#2E3192]'
                } border focus:outline-none`}
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city.id} value={String(city.id)}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Filter */}
            <div>
              <label
                className={`block text-xs tracking-wider uppercase mb-2 ${
                  isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
                }`}
              >
                Destination
              </label>
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg text-sm transition-all duration-300 cursor-pointer ${
                  isDark
                    ? 'bg-[#231F20] border-[#A7AAAC]/20 text-white focus:border-[#00AEEF]'
                    : 'bg-[#FAFAFA] border-[#231F20]/10 text-[#231F20] focus:border-[#2E3192]'
                } border focus:outline-none`}
              >
                <option value="all">All Destinations</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={String(dest.id)}>
                    {dest.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label
                className={`block text-xs tracking-wider uppercase mb-2 ${
                  isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
                }`}
              >
                Max Price: ${priceRange[1].toLocaleString()}
              </label>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#F58220]"
                style={{
                  background: isDark
                    ? `linear-gradient(to right, #F58220 0%, #F58220 ${((priceRange[1] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%, #3a3a3a ${((priceRange[1] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%, #3a3a3a 100%)`
                    : `linear-gradient(to right, #F58220 0%, #F58220 ${((priceRange[1] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%, #e0e0e0 ${((priceRange[1] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%, #e0e0e0 100%)`,
                }}
              />
            </div>

            {/* Sort */}
            <div>
              <label
                className={`block text-xs tracking-wider uppercase mb-2 ${
                  isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
                }`}
              >
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg text-sm transition-all duration-300 cursor-pointer ${
                  isDark
                    ? 'bg-[#231F20] border-[#A7AAAC]/20 text-white focus:border-[#00AEEF]'
                    : 'bg-[#FAFAFA] border-[#231F20]/10 text-[#231F20] focus:border-[#2E3192]'
                } border focus:outline-none`}
              >
                <option value="default">Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 flex items-center justify-between"
        >
          <p className={`text-sm ${isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'}`}>
            Showing{' '}
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
              {filteredPackages.length}
            </span>{' '}
            of {initialPackages.length} packages
          </p>
        </motion.div>

        {/* Packages Grid */}
        <AnimatePresence mode="wait">
          {filteredPackages.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              {filteredPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <PackageCard pkg={pkg} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-24"
            >
              <div
                className={`inline-block p-12 border rounded-2xl ${
                  isDark ? 'border-[#A7AAAC]/10' : 'border-[#231F20]/5'
                }`}
              >
                <span className="text-5xl mb-6 block">🔍</span>
                <p
                  className={`text-xl font-light italic mb-4 ${
                    isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
                  }`}
                >
                  No packages match your filters
                </p>
                <button
                  onClick={resetFilters}
                  className={`text-sm tracking-wider uppercase px-6 py-3 rounded-lg transition-all duration-300 ${
                    isDark
                      ? 'bg-[#00AEEF] text-white hover:bg-[#00AEEF]/80'
                      : 'bg-[#2E3192] text-white hover:bg-[#2E3192]/80'
                  }`}
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
