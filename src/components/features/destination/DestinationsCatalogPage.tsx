'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import type { DestinationsCatalogDTO } from '@/application/destination/dto'

export function DestinationsCatalogPage({ data }: { data: DestinationsCatalogDTO }) {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="primary" className="mb-3">
            Geographical Directory
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Explore Destinations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base sm:text-lg">
            Journey through Countries and Cities to discover handpicked tour packages and private daily tours.
          </p>
        </div>

        {/* Featured Countries */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Countries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.countries.map((country) => (
              <Link key={country.id} href={`/destinations/${country.slug}`} className="group">
                <Card variant="interactive" padding="none" className="relative h-96 w-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url(${country.bannerUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  <div className="absolute bottom-8 left-8 right-8 text-white flex flex-col gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#00aeef]">
                      {country.citiesCount} Major Cities
                    </span>
                    <h3 className="text-3xl font-bold">{country.name}</h3>
                    <p className="text-sm text-slate-300 line-clamp-2">{country.description}</p>
                    <span className="text-xs font-bold text-[#00aeef] mt-2">Explore Country Cities →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Cities Grid */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Popular Cities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.featuredCities.map((city) => (
              <Link
                key={city.id}
                href={`/destinations/${city.countrySlug}/${city.slug}`}
                className="group"
              >
                <Card variant="interactive" padding="none" className="relative h-80 w-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url(${city.bannerUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col gap-1">
                    <span className="text-xs uppercase font-extrabold text-[#00aeef]">{city.countryName}</span>
                    <h4 className="text-xl font-bold group-hover:text-[#00aeef] transition-colors">{city.name}</h4>
                    <span className="text-xs text-slate-300 mt-1">{city.experiencesCount} Experiences →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
