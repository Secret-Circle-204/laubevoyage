'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/providers/theme-provider'
import { Button } from '@/components/ui'
import { ExperienceCard } from '@/components/features/experience/ExperienceCard'
import type { CityExperiencesDTO } from '@/application/destination/dto'

export function CityExperiencesPage({ data }: { data: CityExperiencesDTO }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`py-16 sm:py-20 ${isDark ? 'bg-[#1a1718]' : 'bg-[#FAF8F5]'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Trail */}
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-muted-foreground flex-wrap animate-editorial-reveal">
          <Link
            href="/destinations"
            className="hover:text-foreground transition-colors"
          >
            All Destinations
          </Link>
          <span className="text-border">/</span>
          <Link
            href={`/destinations/${data.country.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {data.country.name}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-semibold">{data.city.name}</span>
        </div>

        {/* Panoramic City Hero Header */}
        <div className="relative min-h-[22rem] sm:min-h-[26rem] w-full rounded-3xl overflow-hidden mb-16 shadow-2xl bg-neutral-950 flex flex-col justify-end animate-editorial-reveal stagger-1">
          {data.city.bannerUrl ? (
            <Image
              src={data.city.bannerUrl}
              alt={data.city.name}
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
                {data.country.name} · Curated Sanctuary
              </span>
              <h1 className="text-4xl sm:text-6xl font-hornbill font-light tracking-tight text-white">
                Experiences in {data.city.name}
              </h1>
              <p className="text-sm sm:text-base text-neutral-300 line-clamp-2 leading-relaxed max-w-xl">
                {data.city.description}
              </p>
            </div>

            <Link href={`/experiences?cityId=${data.city.id}`} className="shrink-0">
              <Button variant="primary" size="lg" className="shadow-2xl active:scale-[0.98] transition-transform">
                Filter {data.city.name} Tours →
              </Button>
            </Link>
          </div>
        </div>

        {/* Experiences Section */}
        <div className="flex flex-col mb-8 pb-4 border-b border-border/50 animate-editorial-reveal stagger-2">
          <span className="text-[10px] uppercase font-semibold text-secondary dark:text-secondary-light">
            Curated Journeys
          </span>
          <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground mt-1">
            Available Journeys & Private Daily Tours
          </h2>
        </div>

        {data.experiences.length === 0 ? (
          <div className="p-16 text-center rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md shadow-lg max-w-xl mx-auto mb-16 animate-editorial-reveal stagger-3">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-secondary">
              <svg className="w-8 h-8 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-2xl font-hornbill font-light mb-2 text-foreground">
              No Scheduled Experiences in {data.city.name}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              We are currently curating new bespoke tours for {data.city.name}. In the meantime, explore other destinations in {data.country.name} or view all available experiences.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/destinations/${data.country.slug}`}>
                <Button variant="outline" size="md">
                  Explore {data.country.name} Cities
                </Button>
              </Link>
              <Link href="/experiences">
                <Button variant="primary" size="md">
                  View All Experiences
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-0">
            {data.experiences.map((item, index) => {
              const staggerClass = index < 6 ? `stagger-${index + 1}` : ''
              return (
                <div key={item.id} className={`animate-editorial-reveal ${staggerClass}`}>
                  <ExperienceCard
                    experience={item}
                    variant="catalog"
                    priority={index < 3}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-10 mt-12 border-t border-border/60">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Page <strong className="text-foreground">{data.pagination.page}</strong> of{' '}
              <strong className="text-foreground">{data.pagination.totalPages}</strong> ({data.pagination.totalDocs} total experiences)
            </span>

            <div className="flex items-center gap-3">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={`/destinations/${data.country.slug}/${data.city.slug}?page=${data.pagination.page - 1}`}
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
                  href={`/destinations/${data.country.slug}/${data.city.slug}?page=${data.pagination.page + 1}`}
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

