'use client'

import React from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui'
import type { HomeHeroDTO } from '@/application/pages/home/dto'

export function HeroWidget({ data }: { data: HomeHeroDTO }) {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-24 pb-16 overflow-hidden bg-slate-950 text-white">
      {/* Background Overlay & Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30 z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,174,239,0.15)_0,transparent_70%)] z-10" />

      {/* Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center gap-8 animate-fade-in">
        <span className="px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-[#00aeef]/10 text-[#00aeef] border border-[#00aeef]/30 backdrop-blur-md">
          Premier Bespoke Experiences
        </span>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] max-w-4xl">
          {data.title}
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
          {data.subtitle}
        </p>

        {/* Quick Search Widget */}
        <div className="w-full max-w-3xl mt-4 p-3 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-3 items-center">
          <div className="w-full sm:flex-1">
            <Input
              placeholder="Where do you want to explore?"
              className="bg-white/90 text-slate-900 border-none shadow-inner"
            />
          </div>
          <Link href="/experiences" className="w-full sm:w-auto">
            <Button variant="accent" size="lg" className="w-full sm:w-auto font-bold px-8 shadow-xl">
              Search Journeys
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
