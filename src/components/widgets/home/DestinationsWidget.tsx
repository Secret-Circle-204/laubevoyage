'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { HomeDestinationCardDTO } from '@/application/pages/home/dto'

const dict = new JsonTranslationDictionary()

export function DestinationsWidget({ destinations }: { destinations: HomeDestinationCardDTO[] }) {
  const { locale } = useLocale()

  return (
    <section className="py-24 bg-background/50 text-foreground transition-colors duration-500 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <span className="text-[11px] uppercase font-semibold text-secondary block mb-2">
              {dict.get(locale, 'destinations.badge')}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light tracking-tight text-foreground">
              {dict.get(locale, 'destinations.title')}
            </h2>
          </div>

          <Link href="/destinations">
            <Button
              variant="outline"
              size="md"
              className="uppercase text-xs font-semibold px-7 rounded-full flex items-center gap-2 group"
            >
              <span>{dict.get(locale, 'destinations.viewAll')}</span>
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1 text-secondary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </Link>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.countrySlug}`}
              className="group relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer shadow-md border border-border/40 bg-card transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
            >
              {dest.imageUrl ? (
                <Image
                  src={dest.imageUrl}
                  alt={dest.countryName || dest.cityName}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-accent/50 gap-2">
                  <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                  </svg>
                  <span className="text-[9px] uppercase font-semibold">L&apos;Aube Voyage</span>
                </div>
              )}

              {/* Natural Cinematic Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

              {/* Editorial Card Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7 flex flex-col justify-end">
                <span className="text-[10px] uppercase font-medium text-white/75 mb-1.5 block">
                  {dest.cityName ? `${dest.countryName} • ${dest.cityName}` : dict.get(locale, 'destinations.featuredRegion')}
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-light text-white leading-tight transition-colors">
                  {dest.countryName}
                </h3>

                <div className="flex items-center gap-2 text-white/90 text-xs uppercase mt-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 font-medium">
                  <span>{dict.get(locale, 'destinations.explore')}</span>
                  <svg
                    className="w-3.5 h-3.5 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
