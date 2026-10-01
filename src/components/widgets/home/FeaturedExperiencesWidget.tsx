'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import { ExperienceCarousel } from '@/components/features/experience/ExperienceCarousel'
import { ExperienceSectionAtmosphere } from '@/components/features/experience/ExperienceSectionAtmosphere'
import type { HomeFeaturedExperienceDTO } from '@/application/pages/home/dto'

const dict = new JsonTranslationDictionary()

export function FeaturedExperiencesWidget({
  experiences,
}: {
  experiences: HomeFeaturedExperienceDTO[]
}) {
  const { locale } = useLocale()

  // Collect distinct scenic image URLs from experiences
  const bgImages = React.useMemo(() => {
    return experiences
      .map((e) => e.imageUrl)
      .filter((url): url is string => Boolean(url))
  }, [experiences])

  const badgeText = dict.get(locale, 'featured.badge')
  const titleText = dict.get(locale, 'featured.title')
  const descText = dict.get(locale, 'featured.description')
  const viewAllText = dict.get(locale, 'featured.viewAll')

  return (
    <section className="relative py-24 sm:py-32 bg-[#0c0a0b] text-white transition-colors duration-500 overflow-hidden border-b border-white/10">
      {/* Background: Shared Scenic Destination Atmosphere */}
      <ExperienceSectionAtmosphere images={bgImages} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 sm:mb-18">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-accent block">
                {badgeText}
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-light tracking-tight text-white leading-tight">
              {titleText}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-neutral-400 font-light leading-relaxed">
              {descText}
            </p>
          </div>

          <Link href="/experiences" className="self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              size="md"
              className="uppercase text-xs font-semibold px-7 py-3 rounded-full flex items-center gap-2.5 group border-white/20 hover:border-accent text-neutral-200 hover:text-accent bg-black/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 cursor-pointer"
            >
              <span>{viewAllText}</span>
              <svg
                className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 rtl:rotate-180 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Button>
          </Link>
        </div>

        {/* Unified Experience Carousel */}
        <ExperienceCarousel
          experiences={experiences}
          withAmbientGlow={true}
        />

        {/* Luxury Brand Hallmark */}
        <div className="mt-16 sm:mt-20 pt-8 border-t border-white/10 flex items-center justify-center gap-4 text-center">
          <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-accent/40" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] font-medium text-neutral-400">
            {dict.get(locale, 'featured.hallmark')}
          </span>
          <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-accent/40" />
        </div>
      </div>
    </section>
  )
}
