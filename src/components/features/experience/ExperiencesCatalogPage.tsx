'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'
import { DiscoverySearchBar } from '@/components/features/search/DiscoverySearchBar'
import type { ExperienceCatalogDTO } from '@/application/experience/dto'

export function ExperiencesCatalogPage({ data }: { data: ExperienceCatalogDTO }) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleClearFilter = (filterKey: string) => {
    const params = new URLSearchParams()
    if (filterKey !== 'q' && data.filters.query) params.set('q', data.filters.query)
    if (filterKey !== 'countryId' && data.filters.countryId)
      params.set('countryId', String(data.filters.countryId))
    if (filterKey !== 'cityId' && data.filters.cityId)
      params.set('cityId', String(data.filters.cityId))
    if (filterKey !== 'type' && data.filters.type) params.set('type', data.filters.type)
    if (filterKey !== 'date' && data.filters.date) params.set('date', data.filters.date)
    if (filterKey !== 'price' && data.filters.minPrice !== undefined)
      params.set('minPrice', String(data.filters.minPrice))
    if (filterKey !== 'price' && data.filters.maxPrice !== undefined)
      params.set('maxPrice', String(data.filters.maxPrice))
    if (filterKey !== 'duration' && data.filters.duration !== undefined)
      params.set('duration', String(data.filters.duration))

    const qStr = params.toString()
    router.push(qStr ? `/experiences?${qStr}` : '/experiences')
  }

  const handleResetAll = () => {
    router.push('/experiences')
  }

  const buildPaginationUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (data.filters.query) params.set('q', data.filters.query)
    if (data.filters.countryId) params.set('countryId', String(data.filters.countryId))
    if (data.filters.cityId) params.set('cityId', String(data.filters.cityId))
    if (data.filters.type) params.set('type', data.filters.type)
    if (data.filters.date) params.set('date', data.filters.date)
    if (data.filters.minPrice !== undefined) params.set('minPrice', String(data.filters.minPrice))
    if (data.filters.maxPrice !== undefined) params.set('maxPrice', String(data.filters.maxPrice))
    if (data.filters.duration !== undefined) params.set('duration', String(data.filters.duration))
    if (targetPage > 1) params.set('page', String(targetPage))
    const qStr = params.toString()
    return qStr ? `/experiences?${qStr}` : '/experiences'
  }

  // Resolve active country/city names for chips
  const activeCountry = data.destinations?.countries.find((c) => c.id === data.filters.countryId)
  const activeCity = data.destinations?.cities.find((c) => c.id === data.filters.cityId)

  const hasActiveFilters = Boolean(
    data.filters.query ||
    data.filters.countryId ||
    data.filters.cityId ||
    data.filters.type ||
    data.filters.date ||
    data.filters.minPrice !== undefined ||
    data.filters.maxPrice !== undefined ||
    data.filters.duration !== undefined,
  )

  return (
    <div
      className={`py-24 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 min-h-screen`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="secondary" className="mb-3">
            {data.labels.badge || 'Curated Collection'}
          </Badge>
          <h1
            className={`text-4xl sm:text-5xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}
          >
            {data.labels.title || 'Discover Experiences'}
          </h1>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3 mb-4" />
          <p className={`text-base sm:text-lg ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
            {data.labels.description ||
              'Explore our bespoke tour packages and daily private tours.'}
          </p>
        </div>

        {/* Unified Luxury Discovery Search Bar Component */}
        <div className="mb-8">
          <DiscoverySearchBar
            variant="catalog"
            destinations={data.destinations}
            initialFilters={data.filters}
          />
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
              Active Filters:
            </span>
            {data.filters.query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f58220]/10 text-[#f58220] border border-[#f58220]/30">
                Keyword: &quot;{data.filters.query}&quot;
                <button onClick={() => handleClearFilter('q')} className="hover:text-red-500">
                  ×
                </button>
              </span>
            )}
            {activeCountry && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f58220]/10 text-[#f58220] border border-[#f58220]/30">
                Country: {activeCountry.name}
                <button
                  onClick={() => handleClearFilter('countryId')}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              </span>
            )}
            {activeCity && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#00aeef]/10 text-[#00aeef] border border-[#00aeef]/30">
                City: {activeCity.name}
                <button onClick={() => handleClearFilter('cityId')} className="hover:text-red-500">
                  ×
                </button>
              </span>
            )}
            {data.filters.type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
                Type: {data.filters.type === 'package' ? 'Packages' : 'Daily Tours'}
                <button onClick={() => handleClearFilter('type')} className="hover:text-red-500">
                  ×
                </button>
              </span>
            )}
            {data.filters.date && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/30">
                Date: {data.filters.date}
                <button onClick={() => handleClearFilter('date')} className="hover:text-red-500">
                  ×
                </button>
              </span>
            )}
            {(data.filters.minPrice !== undefined || data.filters.maxPrice !== undefined) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                Price: {data.filters.minPrice ?? 0} – {data.filters.maxPrice ?? '∞'} EGP
                <button onClick={() => handleClearFilter('price')} className="hover:text-red-500">
                  ×
                </button>
              </span>
            )}
            {data.filters.duration !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/30">
                Duration: {data.filters.duration}+ Days
                <button
                  onClick={() => handleClearFilter('duration')}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={handleResetAll}
              className="text-xs text-slate-400 hover:text-[#f58220] underline ml-2 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Count Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
            Showing <strong className="text-[#f58220]">{data.experiences.length}</strong> of{' '}
            <strong>{data.pagination?.totalItems ?? data.experiences.length}</strong> experiences
          </p>
        </div>

        {/* Experiences Grid OR Empty State */}
        {data.experiences.length === 0 ? (
          <div
            className={`p-16 text-center rounded-2xl border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'} shadow-sm`}
          >
            <div className="text-5xl mb-4">🔍</div>
            <h3
              className={`text-2xl font-serif font-light mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              No Experiences Found
            </h3>
            <p
              className={`text-sm max-w-md mx-auto mb-6 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}
            >
              We couldn&apos;t find any journeys matching your current search criteria. Try
              selecting another destination or clearing your filters.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleResetAll}>
                Reset All Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.experiences.map((item) => (
              <Card
                key={item.id}
                variant="interactive"
                padding="none"
                className="group flex flex-col h-full"
              >
                {/* Image Container */}
                <div className="relative h-72 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white/40">
                      <span className="text-4xl">✈️</span>
                    </div>
                  )}

                  {/* Subtle Gradient Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${
                      isDark ? 'from-[#1a1718] via-transparent' : 'from-black/20 via-transparent'
                    } to-transparent opacity-60`}
                  />

                  {/* Type Badge */}
                  <div className="absolute top-6 left-6">
                    <Badge variant={item.type === 'package' ? 'primary' : 'accent'} size="sm">
                      {item.type === 'package'
                        ? data.labels.packageLabel || 'Package'
                        : data.labels.dailyTourLabel || 'Daily Tour'}
                    </Badge>
                  </div>

                  {/* Price Tag */}
                  <div className="absolute top-6 right-6">
                    <div className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-xl">
                      <span className="text-[#00aeef] font-bold tracking-tight text-sm">
                        <CurrencyDisplay price={item.price} size="sm" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="flex flex-col grow p-8 justify-between">
                  <div>
                    <div className="mb-4">
                      <h3
                        className={`text-2xl font-serif font-light mb-2 transition-colors duration-300 line-clamp-1 ${
                          isDark
                            ? 'text-white group-hover:text-[#f58220]'
                            : 'text-[#231f20] group-hover:text-[#2e3192]'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className="h-1 w-12 bg-[#f58220] transition-all duration-500 group-hover:w-24" />
                    </div>

                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      📍 {item.location}
                    </span>

                    <p
                      className={`text-sm mb-8 line-clamp-2 leading-relaxed ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  <Link href={`/experiences/${item.slug}`}>
                    <Button variant="outline" size="md" className="w-full">
                      {data.labels.viewItinerary || 'View Itinerary'}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Server-Side Pagination Bar (Preserving Active Query Parameters) */}

        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-12 mt-12 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages} (
              {data.pagination.totalItems} total)
            </span>

            <div className="flex items-center gap-3">
              {data.pagination.page > 1 ? (
                <Link
                  href={buildPaginationUrl(data.pagination.page - 1)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  ← Previous
                </span>
              )}

              <span
                className={`text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}
              >
                {data.pagination.page} / {data.pagination.totalPages}
              </span>

              {data.pagination.page < data.pagination.totalPages ? (
                <Link
                  href={buildPaginationUrl(data.pagination.page + 1)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
