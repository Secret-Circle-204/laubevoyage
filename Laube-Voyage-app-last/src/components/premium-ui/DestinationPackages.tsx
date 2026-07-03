'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageCard } from '@/components/premium-ui/PackageCard'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'
import Link from 'next/link'
import { useTheme } from '../providers/ThemeProvider'

import type { Package } from '@/payload-types'

interface DestinationPackagesProps {
  packages: Package[]
  destinationName: string
}

export function DestinationPackages({ packages, destinationName }: DestinationPackagesProps) {
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Extract unique cities (filtering out potential null/undefined values)
  const cities = [
    'All',
    ...Array.from(
      new Set(
        packages
          .map((p) => {
            const firstCity = Array.isArray(p.city) && p.city.length > 0 ? p.city[0] : null
            const val = firstCity && typeof firstCity === 'object' ? firstCity.name : firstCity
            return val?.toString()
          })
          .filter(Boolean) as string[],
      ),
    ),
  ].sort()

  const filteredPackages =
    selectedCity === 'All'
      ? packages
      : packages.filter((p) => {
          const firstCity = Array.isArray(p.city) && p.city.length > 0 ? p.city[0] : null
          const cityName = firstCity && typeof firstCity === 'object' ? firstCity.name : firstCity
          return cityName === selectedCity
        })

  if (packages.length === 0) {
    return (
      <AnimatedSection animation="fade-up" className="text-center py-12">
        <div className="inline-block p-8 border border-dark/5 dark:border-gray/10 rounded-2xl">
          <p className="text-gray dark:text-gray text-lg font-light italic transition-colors mb-4">
            No travel packages available yet for {destinationName}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/packages"
              className="px-5 py-2.5 border border-primary/50 text-primary dark:text-secondary text-sm tracking-widest uppercase font-medium rounded-full hover:bg-primary hover:text-white dark:hover:bg-secondary transition-colors"
            >
              Browse All Packages
            </Link>
          </div>
        </div>
      </AnimatedSection>
    )
  }

  return (
    <div>
      {/* City Filter */}
      {cities.length > 1 && (
        <AnimatedSection animation="fade-up" className="flex flex-wrap justify-center gap-3 mb-12">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`
                px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold transition-all duration-300
                ${
                  selectedCity === city
                    ? 'bg-accent text-white shadow-lg scale-105'
                    : isDark
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black'
                }
              `}
            >
              {city}
            </button>
          ))}
        </AnimatedSection>
      )}

      {/* Packages Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCity}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatedContainer
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            staggerDelay={0.1}
          >
            {filteredPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </AnimatedContainer>
        </motion.div>
      </AnimatePresence>

      {filteredPackages.length === 0 && (
        <p className="text-center text-gray/50 italic mt-12">
          No packages found for {selectedCity}.
        </p>
      )}
    </div>
  )
}
