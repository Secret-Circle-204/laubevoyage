'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge } from '@/components/ui'
import type { DestinationsCatalogDTO } from '@/application/destination/dto'

export function DestinationsCatalogPage({ data }: { data: DestinationsCatalogDTO }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`py-24 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="primary" className="mb-3">
            Geographical Directory
          </Badge>
          <h1 className={`text-4xl sm:text-5xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            Explore Destinations
          </h1>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3 mb-4" />
          <p className={`text-base sm:text-lg ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
            Journey through Countries and Cities to discover handpicked tour packages and private daily tours.
          </p>
        </div>

        {/* Featured Countries */}
        <div className="mb-16">
          <h2 className={`text-2xl font-serif font-light mb-6 ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            Countries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.countries.map((country) => (
              <Link key={country.id} href={`/destinations/${country.slug}`} className="group">
                <Card variant="interactive" padding="none" className="relative h-96 w-full overflow-hidden">
                  <Image
                    src={country.bannerUrl || "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop"}
                    alt={country.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#231F20] via-[#231F20]/40 to-transparent" />

                  <div className="absolute bottom-8 left-8 right-8 text-white flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-widest text-[#00aeef] font-semibold">
                      {country.citiesCount} Major Cities
                    </span>
                    <h3 className="text-3xl font-serif font-light group-hover:text-[#f58220] transition-colors">{country.name}</h3>
                    <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{country.description}</p>
                    <div className="flex items-center gap-2 text-[#00aeef] text-sm font-semibold mt-2">
                      <span>Explore Country Cities</span>
                      <svg className="w-4 h-4 text-[#f58220]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Cities Grid */}
        <div>
          <h2 className={`text-2xl font-serif font-light mb-6 ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            Popular Cities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.featuredCities.map((city) => (
              <Link
                key={city.id}
                href={`/destinations/${city.countrySlug}/${city.slug}`}
                className="group"
              >
                <Card variant="interactive" padding="none" className="relative h-80 w-full overflow-hidden">
                  <Image
                    src={city.bannerUrl || "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop"}
                    alt={city.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#231F20] via-[#231F20]/40 to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col gap-1">
                    <span className="text-xs uppercase font-semibold tracking-widest text-[#00aeef]">{city.countryName}</span>
                    <h4 className="text-2xl font-serif font-light group-hover:text-[#f58220] transition-colors">{city.name}</h4>
                    <div className="flex items-center gap-2 text-white/80 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
                      <span>{city.experiencesCount} Experiences</span>
                      <svg className="w-4 h-4 text-[#f58220]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
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
