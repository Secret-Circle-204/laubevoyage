'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/providers/theme-provider'
import type { HomeDestinationCardDTO } from '@/application/pages/home/dto'

export function DestinationsWidget({ destinations }: { destinations: HomeDestinationCardDTO[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className={`py-20 ${isDark ? 'bg-[#1a1718]' : 'bg-white'} transition-colors duration-500 border-b border-white/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.25em] font-medium text-[#00aeef] block mb-2">
            Geographical Exploration
          </span>
          <h2 className={`text-3xl sm:text-4xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            Top Travel Destinations
          </h2>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3" />
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.countrySlug}/${dest.citySlug}`}
              className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer shadow-lg"
            >
              <Image
                src={dest.imageUrl || "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop"}
                alt={dest.cityName}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#231F20] via-[#231F20]/30 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="text-[#00aeef] text-xs tracking-widest uppercase mb-1 block font-semibold">
                  {dest.countryName}
                </span>
                <h3 className="text-2xl font-serif font-light text-white mb-2 group-hover:text-[#f58220] transition-colors duration-300">
                  {dest.cityName}
                </h3>

                <div className="flex items-center gap-2 text-white/80 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Explore {dest.experiencesCount} Journeys</span>
                  <svg className="w-4 h-4 text-[#f58220]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
