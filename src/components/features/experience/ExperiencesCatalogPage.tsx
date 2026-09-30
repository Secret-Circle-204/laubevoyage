'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLoadingNavigation } from '@/application/loading/use-loading-navigation'
import { useTheme } from '@/providers/theme-provider'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import { Button } from '@/components/ui'
import { DiscoverySearchBar } from '@/components/features/search/DiscoverySearchBar'
import { ExperienceCard } from '@/components/features/experience/ExperienceCard'
import { ExperienceSectionAtmosphere } from '@/components/features/experience/ExperienceSectionAtmosphere'
import type { ExperienceCatalogDTO } from '@/application/experience/dto'

const dict = new JsonTranslationDictionary()

export function ExperiencesCatalogPage({ data }: { data: ExperienceCatalogDTO }) {
  const router = useRouter()
  const loadingNav = useLoadingNavigation()
  const { theme } = useTheme()
  const { locale } = useLocale()
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
    loadingNav.push(qStr ? `/experiences?${qStr}` : '/experiences')
  }

  const handleResetAll = () => {
    loadingNav.push('/experiences')
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

  // Authentic scenic image URLs from current experiences
  const bgImages = React.useMemo(() => {
    return data.experiences
      .map((e) => e.imageUrl)
      .filter((url): url is string => Boolean(url && typeof url === 'string'))
  }, [data.experiences])

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
      className={`pt-20 sm:pt-24 pb-0 ${isDark ? 'bg-[#1a1718]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen flex flex-col`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-6">
        {/* Editorial Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 animate-editorial-reveal">
          <span className="text-xs font-semibold text-secondary dark:text-secondary-light block mb-3">
            {data.labels.badge || 'Curated Collection'}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-hornbill font-light tracking-tight text-foreground">
            {data.labels.title || 'Discover Experiences'}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {data.labels.description ||
              'Explore our bespoke tour packages and daily private tours, curated for discerning travelers.'}
          </p>
        </div>

        {/* Unified Luxury Discovery Search Console */}
        <div className="mb-10 relative z-30 animate-editorial-reveal stagger-1">
          <DiscoverySearchBar
            variant="hero"
            destinations={data.destinations}
            initialFilters={data.filters}
            budgetPresets={data.budgetPresets}
          />
        </div>

        {/* Harmonized Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2.5 mb-10 p-3.5 rounded-2xl bg-card/60 dark:bg-card/40 border border-border/70 backdrop-blur-sm relative z-10 animate-editorial-reveal stagger-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {dict.get(locale, 'catalog.activeCriteria')}
            </span>
            {data.filters.query && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaKeyword')}:</span>
                <span className="font-semibold">&quot;{data.filters.query}&quot;</span>
                <button
                  onClick={() => handleClearFilter('q')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {activeCountry && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaCountry')}:</span>
                <span className="font-semibold">{activeCountry.name}</span>
                <button
                  onClick={() => handleClearFilter('countryId')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {activeCity && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaCity')}:</span>
                <span className="font-semibold">{activeCity.name}</span>
                <button
                  onClick={() => handleClearFilter('cityId')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {data.filters.type && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaFormat')}:</span>
                <span className="font-semibold">
                  {data.filters.type === 'package' ? dict.get(locale, 'catalog.filterPackages') : dict.get(locale, 'catalog.filterDailyTours')}
                </span>
                <button
                  onClick={() => handleClearFilter('type')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {data.filters.date && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaDate')}:</span>
                <span className="font-semibold">{data.filters.date}</span>
                <button
                  onClick={() => handleClearFilter('date')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {(data.filters.minPrice !== undefined || data.filters.maxPrice !== undefined) &&
              (() => {
                const minPreset = data.budgetPresets?.minPresets.find(
                  (p) => p.egpValue === data.filters.minPrice,
                )
                const maxPreset = data.budgetPresets?.maxPresets.find(
                  (p) => p.egpValue === data.filters.maxPrice,
                )
                const label =
                  minPreset && maxPreset
                    ? `${minPreset.displayLabel} – ${maxPreset.displayLabel}`
                    : minPreset
                      ? minPreset.displayLabel
                      : maxPreset
                        ? maxPreset.displayLabel
                        : `${data.filters.minPrice ?? 0} – ${data.filters.maxPrice ?? '∞'} ${data.budgetPresets?.currencyCode || 'EGP'}`

                return (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                    <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaBudget')}:</span>
                    <span className="font-semibold">{label}</span>
                    <button
                      onClick={() => handleClearFilter('price')}
                      aria-label={dict.get(locale, 'catalog.removeFilter')}
                      className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                )
              })()}
            {data.filters.duration !== undefined && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-sm transition-all duration-150 active:scale-[0.98]">
                <span className="text-muted-foreground font-normal">{dict.get(locale, 'catalog.criteriaDuration')}:</span>
                <span className="font-semibold">{data.filters.duration}+ {dict.get(locale, 'experience.dayPlural') || 'Days'}</span>
                <button
                  onClick={() => handleClearFilter('duration')}
                  aria-label={dict.get(locale, 'catalog.removeFilter')}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            <button
              onClick={handleResetAll}
              className="text-xs font-semibold text-muted-foreground hover:text-accent underline underline-offset-4 decoration-border hover:decoration-accent transition-colors ml-auto cursor-pointer"
            >
              {dict.get(locale, 'catalog.clearAll')}
            </button>
          </div>
        )}
      </div>

      {/* Experiences Presentation Showcase Section: Full-Width Atmosphere (Edge-to-Edge) */}
      <section
        aria-label="Curated Experiences Showcase"
        className="relative w-full py-16 sm:py-24 bg-[#0c0a0b] text-white transition-colors duration-500 overflow-hidden border-t border-b border-white/10 grow"
      >
        {/* Shared Reusable Scenic Atmosphere (Full-Width Edge-to-Edge, calibrated blur 18px) */}
        <ExperienceSectionAtmosphere
          images={bgImages}
          blur="blur(18px)"
          activeOpacityClassName="opacity-60 sm:opacity-70"
        />

        {/* Inner Content Container: neatly bounds the grid and controls */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          {/* Section Header / Results Counter */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 animate-editorial-reveal">
            <span className="text-xs sm:text-sm font-semibold text-neutral-300">
              Curated Journeys
            </span>
            <span className="text-xs font-medium text-neutral-400">
              Showing{' '}
              <strong className="text-accent font-bold">
                {data.experiences.length}
              </strong>{' '}
              of{' '}
              <strong className="text-white font-semibold">
                {data.pagination?.totalItems ?? data.experiences.length}
              </strong>
            </span>
          </div>

          {/* Experiences Grid OR Concierge Empty State */}
          {data.experiences.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-2xl border border-white/10 bg-[#161415]/80 backdrop-blur-md max-w-xl mx-auto relative z-10 animate-editorial-reveal">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-light mb-3 text-white">
                No Journeys Found
              </h3>
              <p className="text-sm sm:text-base max-w-md mx-auto mb-8 text-neutral-400 leading-relaxed">
                We couldn&apos;t find any journeys matching your current criteria. Our Private
                Concierge can curate a bespoke itinerary tailored to your desires, or you may clear
                your active filters.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="primary" size="md" onClick={handleResetAll}>
                  Reset All Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 relative z-10">
              {data.experiences.map((item, index) => {
                const staggerClass = index < 6 ? `stagger-${index + 1}` : ''
                return (
                  <div key={item.id} className={`animate-editorial-reveal ${staggerClass}`}>
                    <ExperienceCard
                      experience={item}
                      variant="catalog"
                      withAmbientGlow={false}
                      labels={data.labels}
                      priority={index < 3}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Server-Side Pagination Bar */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-10 mt-12 border-t border-white/10 relative z-10">
              <span className="text-xs sm:text-sm font-medium text-neutral-400">
                Page <strong className="text-white">{data.pagination.page}</strong> of{' '}
                <strong className="text-white">{data.pagination.totalPages}</strong> (
                {data.pagination.totalItems} total)
              </span>

              <div className="flex items-center gap-3">
                {data.pagination.page > 1 ? (
                  <Link
                    href={buildPaginationUrl(data.pagination.page - 1)}
                    aria-label="Previous Page"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/15 text-neutral-200 hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                    <span>Previous</span>
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-neutral-600 cursor-not-allowed flex items-center gap-1.5 opacity-40">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                    <span>Previous</span>
                  </span>
                )}

                <span className="text-xs sm:text-sm font-mono px-2 text-neutral-300">
                  {data.pagination.page} / {data.pagination.totalPages}
                </span>

                {data.pagination.page < data.pagination.totalPages ? (
                  <Link
                    href={buildPaginationUrl(data.pagination.page + 1)}
                    aria-label="Next Page"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/15 text-neutral-200 hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                  >
                    <span>Next</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-neutral-600 cursor-not-allowed flex items-center gap-1.5 opacity-40">
                    <span>Next</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
