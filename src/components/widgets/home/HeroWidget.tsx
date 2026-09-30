'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { useSession } from '@/providers'
import { DiscoverySearchBar } from '@/components/features/search/DiscoverySearchBar'
import type { HomeHeroDTO } from '@/application/pages/home/dto'

export function HeroWidget({ data }: { data: HomeHeroDTO }) {
  const { session } = useSession()

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen pt-32 pb-20 sm:pt-40 sm:pb-28 flex items-center justify-center bg-background text-foreground z-20">
      {/* Background Cinematic Image with Seamless Canvas Vignette - Strictly clips image & gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src={data.backgroundImageUrl || '/images/hero-bg.jpg'}
          alt="L'Aube Voyage Luxury Travel"
          fill
          sizes="100vw"
          className="object-cover scale-100 transition-transform duration-1000"
          priority
        />
        {/* Layered luxury lighting: darker top for header contrast, soft middle, natural fade to canvas */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-background z-10" />
      </div>

      {/* Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center gap-6">
        {/* Editorial Eyebrow with Delicate Hairlines */}
        <div className="flex items-center justify-center gap-4 soft-reveal [animation-delay:0ms]">
          <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-white/60" />
          <span className="text-white/90 text-[11px] sm:text-xs uppercase font-medium">
            Bespoke Luxury Voyages
          </span>
          <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-white/60" />
        </div>

        {/* Grand Editorial Hornbill Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight leading-[1.1] max-w-4xl mx-auto soft-reveal [animation-delay:80ms]">
          Journeys Crafted Beyond the Horizon
        </h1>

        {/* Subtitle from DTO */}
        {data.subtitle && (
          <p className="text-sm sm:text-base lg:text-lg font-light max-w-2xl mx-auto text-white/80 leading-relaxed soft-reveal [animation-delay:140ms]">
            {data.subtitle}
          </p>
        )}

        {/* Unified Luxury Discovery Search Capsule with Elevated Stacking Context */}
        <div className="w-full max-w-5xl mx-auto mt-4 relative z-30 soft-reveal [animation-delay:200ms]">
          <DiscoverySearchBar
            variant="hero"
            destinations={data.destinations}
            budgetPresets={data.budgetPresets}
          />
        </div>

        {/* Refined CTA Actions with Lower Stacking Context */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-2 relative z-0 soft-reveal [animation-delay:260ms]">
          <Link href="/experiences">
            <Button
              variant="accent"
              size="lg"
              className="rounded-full px-8 uppercase text-xs font-semibold shadow-xl shadow-accent/25 border border-accent-light/30"
            >
              {data.ctaExploreText || 'Explore Experiences'}
            </Button>
          </Link>
          <Link href="/destinations">
            <Button
              variant="glass"
              size="lg"
              className="rounded-full px-8 uppercase text-xs font-medium text-white hover:bg-white/20"
            >
              {data.ctaDiscoverText || 'Browse Destinations'}
            </Button>
          </Link>
          {!session?.isAuthenticated && (
            <Link href="/register">
              <Button
                variant="primary"
                size="lg"
                className="rounded-full px-8 uppercase text-xs font-semibold text-white bg-[#1a1e4e] hover:bg-[#252875] border border-white/20 shadow-lg shadow-[#1a1e4e]/40 transition-all duration-300 hover:scale-105"
              >
                {data.ctaJoinVoyagersText || 'Sign In'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}


