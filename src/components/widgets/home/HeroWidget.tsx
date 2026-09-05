'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DiscoverySearchBar } from '@/components/features/search/DiscoverySearchBar'
import type { HomeHeroDTO } from '@/application/pages/home/dto'

export function HeroWidget({ data }: { data: HomeHeroDTO }) {
  return (
    <section className="relative min-h-screen py-24 sm:py-32 flex items-center justify-center overflow-hidden bg-[#231F20] text-white">
      {/* Background Overlay & Image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#231F20]/90 via-[#231F20]/60 to-[#231F20] z-10" />
      <div className="absolute inset-0 z-0">
        <Image
          src={data.backgroundImageUrl || "/images/hero-bg.jpg"}
          alt="L'Aube Voyage Luxury Hero"
          fill
          sizes="100vw"
          className="object-cover scale-105 transition-transform duration-1000"
          priority
        />
      </div>

      {/* Content Container */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 text-center flex flex-col items-center gap-6">
        <div className="flex flex-col items-center mb-2">
          {/* Centered Brand Logo */}
          <div className="relative w-64 h-36 sm:w-80 sm:h-44 mb-3">
            <Image
              src="/logos/LAube-Voyage-logo-name-white.svg"
              alt="L'AUBE VOYAGE"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Gold Divider Accent Line */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#f58220]" />
            <span className="text-white text-xs sm:text-sm tracking-[0.3em] uppercase font-light">
              Est. 1996
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#f58220]" />
          </div>
        </div>

        {/* Dynamic Subtitle from DTO */}
        <p className="text-base sm:text-lg font-light max-w-2xl mx-auto text-white/80 tracking-wide">
          {data.subtitle}
        </p>

        {/* Unified Luxury Discovery Search Widget */}
        <div className="w-full max-w-4xl mx-auto mt-2">
          <DiscoverySearchBar
            variant="hero"
            destinations={data.destinations}
          />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
          <Link href="/experiences">
            <button className="px-8 py-3 bg-[#f58220] hover:bg-[#2e3192] text-white font-semibold tracking-widest text-xs sm:text-sm uppercase transition-all duration-300 shadow-2xl rounded-sm">
              {data.ctaExploreText || 'Explore Experiences'}
            </button>
          </Link>
          <Link href="/destinations">
            <button className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 font-semibold tracking-widest text-xs sm:text-sm uppercase transition-all duration-300 shadow-xl rounded-sm">
              {data.ctaDiscoverText || 'Browse Destinations'}
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}


