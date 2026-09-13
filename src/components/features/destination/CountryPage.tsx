'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Button } from '@/components/ui'
import type { CountryDetailsDTO } from '@/application/destination/dto'

import { useTheme } from '@/providers/theme-provider'
import Image from 'next/image'

export function CountryPage({ data }: { data: CountryDetailsDTO }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`py-16 sm:py-20 ${isDark ? 'bg-[#1a1718]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Trail */}
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-muted-foreground animate-editorial-reveal">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span>All Destinations</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-semibold">{data.country.name}</span>
        </div>

        {/* Panoramic Territory Hero Header */}
        <div className="relative min-h-[24rem] sm:min-h-[28rem] w-full rounded-3xl overflow-hidden mb-16 shadow-2xl bg-neutral-950 flex flex-col justify-end animate-editorial-reveal stagger-1">
          {data.country.bannerUrl ? (
            <Image
              src={data.country.bannerUrl}
              alt={data.country.name}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-80 transition-transform duration-1000 ease-out hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

          <div className="relative z-10 p-8 sm:p-12 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase bg-black/40 backdrop-blur-md border border-white/20 text-secondary-light w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Grand Territory
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-hornbill font-light tracking-tight text-white">
                {data.country.name}
              </h1>
              <p className="text-sm sm:text-base text-neutral-300 line-clamp-3 leading-relaxed max-w-xl">
                {data.country.description}
              </p>
            </div>

            <Link href={`/experiences?countryId=${data.country.id}`} className="shrink-0">
              <Button variant="primary" size="lg" className="shadow-2xl active:scale-[0.98] transition-transform">
                Filter {data.country.name} Experiences →
              </Button>
            </Link>
          </div>
        </div>

        {/* Cities Section */}
        <div className="flex flex-col mb-8 pb-4 border-b border-border/50 animate-editorial-reveal stagger-2">
          <span className="text-[10px] uppercase font-semibold text-secondary dark:text-secondary-light">
            Curated Destinations
          </span>
          <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
            Storied Cities in {data.country.name}
          </h2>
        </div>

        {data.cities.length === 0 ? (
          <div className="p-16 text-center rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md shadow-lg max-w-xl mx-auto mb-16 animate-editorial-reveal stagger-3">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-secondary">
              <svg className="w-8 h-8 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M3.6 9h16.8M3.6 15h16.8" />
                <path d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
              </svg>
            </div>
            <h3 className="text-2xl font-hornbill font-light mb-2 text-foreground">
              No Cities Listed for {data.country.name}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
              Explore our other global territories or view all currently available private journeys.
            </p>
            <Link href="/destinations">
              <Button variant="primary" size="md">
                View All Destinations
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.cities.map((city, index) => {
              const staggerClass = index < 6 ? `stagger-${index + 1}` : ''
              return (
                <Link key={city.id} href={`/destinations/${data.country.slug}/${city.slug}`} className="group block">
                  <Card
                    variant="interactive"
                    padding="none"
                    className={`flex flex-col h-full bg-card border-border/70 hover:border-secondary/40 rounded-2xl overflow-hidden card-interactive-luxury animate-editorial-reveal ${staggerClass}`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-card border-b border-border/40">
                      {city.bannerUrl ? (
                        <Image
                          src={city.bannerUrl}
                          alt={city.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-[1.028] transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-neutral-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-85 group-hover:opacity-90 transition-opacity duration-500" />
                    </div>

                    <div className="p-6 sm:p-7 flex flex-col justify-between flex-grow gap-4">
                      <div>
                        <h3 className="text-2xl font-hornbill font-light text-foreground group-hover:text-primary dark:group-hover:text-secondary-light transition-colors duration-300">
                          {city.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {city.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
                        <span className="text-xs uppercase font-medium text-muted-foreground">
                          {city.experiencesCount > 0 ? `${city.experiencesCount} Private Journeys` : 'Explore City'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary dark:text-secondary group-hover:text-primary-dark dark:group-hover:text-secondary-light transition-colors">
                          <span>View Experiences</span>
                          <svg
                            className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-10 mt-12 border-t border-border/60">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Page <strong className="text-foreground">{data.pagination.page}</strong> of{' '}
              <strong className="text-foreground">{data.pagination.totalPages}</strong> ({data.pagination.totalDocs} total cities)
            </span>

            <div className="flex items-center gap-3">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={`/destinations/${data.country.slug}?page=${data.pagination.page - 1}`}
                  aria-label="Previous Page"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 border border-border/40 text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5 opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </span>
              )}

              <span className="text-xs sm:text-sm font-hornbill px-2 text-foreground">
                {data.pagination.page} / {data.pagination.totalPages}
              </span>

              {data.pagination.hasNextPage ? (
                <Link
                  href={`/destinations/${data.country.slug}?page=${data.pagination.page + 1}`}
                  aria-label="Next Page"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:border-secondary/50 hover:text-primary dark:hover:text-secondary transition-colors flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 border border-border/40 text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5 opacity-50">
                  <span>Next</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
