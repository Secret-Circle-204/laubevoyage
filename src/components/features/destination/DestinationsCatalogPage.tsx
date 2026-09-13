'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/providers/theme-provider'
import { Card } from '@/components/ui'
import type { DestinationsCatalogDTO } from '@/application/destination/dto'

export function DestinationsCatalogPage({ data }: { data: DestinationsCatalogDTO }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const currentCountriesPage = data.countriesPagination.page
  const currentCitiesPage = data.pagination.page

  const buildCountryPageUrl = (targetCountriesPage: number) => {
    const params = new URLSearchParams()
    if (targetCountriesPage > 1) {
      params.set('countriesPage', String(targetCountriesPage))
    }
    if (currentCitiesPage > 1) {
      params.set('page', String(currentCitiesPage))
    }
    const q = params.toString()
    return q ? `/destinations?${q}#countries` : '/destinations#countries'
  }

  const buildCityPageUrl = (targetCitiesPage: number) => {
    const params = new URLSearchParams()
    if (currentCountriesPage > 1) {
      params.set('countriesPage', String(currentCountriesPage))
    }
    if (targetCitiesPage > 1) {
      params.set('page', String(targetCitiesPage))
    }
    const q = params.toString()
    return q ? `/destinations?${q}#cities` : '/destinations#cities'
  }

  return (
    <div className={`py-20 sm:py-24 ${isDark ? 'bg-[#1a1718]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Atlas Editorial Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 animate-editorial-reveal">
          <span className="text-[11px] uppercase font-semibold text-secondary dark:text-secondary-light block mb-3">
            The World · Curated by L&apos;Aube
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-hornbill font-light tracking-tight text-foreground">
            Explore Destinations
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Curated journeys across storied territories, ancient rivers, and vibrant cultural sanctuaries.
          </p>
        </div>

        {/* Featured Territories (Countries) */}
        <div id="countries" className="mb-20 sm:mb-24 animate-editorial-reveal stagger-1 scroll-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-border/50 gap-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-secondary dark:text-secondary-light">
                Grand Territories
              </span>
              <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
                Curated Countries
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Curated journeys across storied territories ({data.countriesPagination.totalDocs} total countries).
              </p>
            </div>
            <div className="text-xs uppercase font-medium text-muted-foreground shrink-0">
              Showing {(data.countriesPagination.page - 1) * data.countriesPagination.limit + 1}–{Math.min(data.countriesPagination.page * data.countriesPagination.limit, data.countriesPagination.totalDocs)} of {data.countriesPagination.totalDocs} Countries
            </div>
          </div>

          {data.countries.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border/70 bg-card/40">
              <h3 className="text-xl font-hornbill font-light text-foreground mb-2">No Territories Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                This page of territories does not contain any active destinations.
              </p>
              <Link
                href="/destinations#countries"
                className="px-5 py-2.5 rounded-xl border border-secondary/50 bg-secondary/10 text-secondary-light hover:bg-secondary/20 transition-colors text-xs font-semibold inline-flex items-center gap-2"
              >
                <span>Return to First Page</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
              {data.countries.map((country, index) => {
                const staggerClass = index < 2 ? `stagger-${index + 1}` : ''
                return (
                  <Link key={country.id} href={`/destinations/${country.slug}`} className="group block">
                    <Card
                      variant="interactive"
                      padding="none"
                      className={`relative min-h-[26rem] sm:min-h-[28rem] w-full overflow-hidden rounded-3xl border-border/70 hover:border-secondary/40 card-interactive-luxury animate-editorial-reveal ${staggerClass}`}
                    >
                      <Image
                        src={country.bannerUrl || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop"}
                        alt={country.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.028]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-85 group-hover:opacity-90 transition-opacity duration-500" />

                      {/* Top Territory Badge */}
                      <div className="absolute top-6 left-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          {country.citiesCount} Storied Cities
                        </span>
                      </div>

                      {/* Bottom Editorial Content */}
                      <div className="absolute bottom-8 left-8 right-8 text-white flex flex-col gap-2.5">
                        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-hornbill font-light text-white group-hover:text-secondary-light transition-all duration-200 group-hover:-translate-y-0.5">
                          {country.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 leading-relaxed max-w-xl">
                          {country.description}
                        </p>
                        <div className="flex items-center gap-2 text-secondary-light text-xs sm:text-sm font-semibold mt-2 group-hover:text-white transition-colors">
                          <span>Explore Territory</span>
                          <svg
                            className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-1.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Server-Side Atlas Countries Pagination Bar */}
          {data.countriesPagination.totalPages > 1 && (
            <div className="mt-14 flex items-center justify-center gap-4">
              {data.countriesPagination.hasPrevPage ? (
                <Link
                  href={buildCountryPageUrl(data.countriesPagination.page - 1)}
                  aria-label="Previous Countries Page"
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors text-xs font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="px-5 py-2.5 rounded-xl border border-border/40 bg-card/60 text-muted-foreground/40 text-xs font-semibold cursor-not-allowed flex items-center gap-2 opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </span>
              )}

              <span className="text-xs sm:text-sm font-hornbill px-3 text-foreground">
                Page {data.countriesPagination.page} of {data.countriesPagination.totalPages}
              </span>

              {data.countriesPagination.hasNextPage ? (
                <Link
                  href={buildCountryPageUrl(data.countriesPagination.page + 1)}
                  aria-label="Next Countries Page"
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors text-xs font-semibold flex items-center gap-2"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-5 py-2.5 rounded-xl border border-border/40 bg-card/60 text-muted-foreground/40 text-xs font-semibold cursor-not-allowed flex items-center gap-2 opacity-50">
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cities Directory (The Cities Compendium) */}
        <div id="cities" className="scroll-mt-12 animate-editorial-reveal stagger-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-border/50 gap-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-secondary dark:text-secondary-light">
                Active Harbors & Sanctuaries
              </span>
              <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
                The Cities Compendium
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Explore every active destination across our global network ({data.pagination.totalDocs} total destinations).
              </p>
            </div>
            <div className="text-xs uppercase font-medium text-muted-foreground shrink-0">
              Showing {(data.pagination.page - 1) * data.pagination.limit + 1}–{Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalDocs)} of {data.pagination.totalDocs} Cities
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {data.cities.map((city, index) => {
              const staggerClass = index < 6 ? `stagger-${index + 1}` : ''
              return (
                <Link
                  key={city.id}
                  href={`/destinations/${city.countrySlug}/${city.slug}`}
                  className="group block"
                >
                  <Card
                    variant="interactive"
                    padding="none"
                    className={`relative aspect-[4/5] sm:h-80 w-full overflow-hidden rounded-2xl border-border/70 hover:border-secondary/40 card-interactive-luxury animate-editorial-reveal ${staggerClass}`}
                  >
                    <Image
                      src={city.bannerUrl || "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop"}
                      alt={city.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.028]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-85 group-hover:opacity-90 transition-opacity duration-500" />

                    {/* Top Country Tag */}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] uppercase font-bold text-secondary-light px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15">
                        {city.countryName}
                      </span>
                    </div>

                    {/* Bottom City Content */}
                    <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col gap-1">
                      <h4 className="text-2xl font-hornbill font-light group-hover:text-secondary-light transition-all duration-200 group-hover:-translate-y-0.5">
                        {city.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium mt-1 group-hover:text-white transition-colors">
                        <span>Explore City</span>
                        <svg
                          className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Server-Side Atlas Cities Pagination Bar */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-14 flex items-center justify-center gap-4">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={buildCityPageUrl(data.pagination.page - 1)}
                  aria-label="Previous Cities Page"
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors text-xs font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="px-5 py-2.5 rounded-xl border border-border/40 bg-card/60 text-muted-foreground/40 text-xs font-semibold cursor-not-allowed flex items-center gap-2 opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </span>
              )}

              <span className="text-xs sm:text-sm font-hornbill px-3 text-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>

              {data.pagination.hasNextPage ? (
                <Link
                  href={buildCityPageUrl(data.pagination.page + 1)}
                  aria-label="Next Cities Page"
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors text-xs font-semibold flex items-center gap-2"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-5 py-2.5 rounded-xl border border-border/40 bg-card/60 text-muted-foreground/40 text-xs font-semibold cursor-not-allowed flex items-center gap-2 opacity-50">
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
