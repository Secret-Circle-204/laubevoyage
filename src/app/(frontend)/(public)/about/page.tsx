import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Card, Badge, Button } from '@/components/ui'

export const metadata: Metadata = {
  title: "Who We Are | L'Aube Voyage",
  description: "Learn about L'Aube Voyage, Egypt's premier luxury travel provider delivering bespoke Nile cruises, private Egyptologist tours, and unforgettable desert safaris since 1996.",
}

export default function AboutPage() {
  return (
    <div className="bg-[#231F20] text-slate-100 min-h-screen transition-colors duration-500 overflow-hidden">
      {/* Hero Header */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-[#231F20]">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=2070&auto=format&fit=crop"
            alt="L'Aube Voyage Heritage"
            fill
            sizes="100vw"
            className="object-cover scale-105 opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#231F20]/80 via-[#231F20]/60 to-[#231F20]" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
          <Badge variant="accent" size="sm" className="mb-4">
            EST. 1996
          </Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-light text-white mb-6 tracking-tight drop-shadow-2xl">
            WHO WE ARE
          </h1>
          <div className="h-1 w-24 bg-[#f58220] mx-auto mb-6" />
          <p className="text-base sm:text-xl text-white/90 font-light tracking-[0.3em] uppercase max-w-2xl mx-auto border-y border-white/20 py-4 backdrop-blur-sm">
            Quarter Century of Elite Travel Expertise
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        {/* Heritage Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-[#f58220] text-xs tracking-[0.4em] uppercase font-bold block">
              Historic Excellence
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif font-light text-white leading-tight">
              A Quarter Century of <br />
              <span className="text-[#00aeef]">Elite Expertise</span>
            </h2>
            <div className="h-1 w-16 bg-[#f58220]" />
            <p className="text-slate-300 font-light leading-relaxed text-base sm:text-lg">
              Founded with a passion for historic perfection, L&apos;Aube Voyage crafts bespoke journeys across Egypt and beyond. We combine 5-star luxury accommodations with private VIP Egyptologist guides to deliver unforgettable travel experiences.
            </p>
          </div>

          <div className="relative h-[480px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
            <Image
              src="https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=2070&auto=format&fit=crop"
              alt="Ancient Treasures"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#231F20] via-transparent to-transparent opacity-60" />
          </div>
        </div>

        {/* Pillars */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="primary" className="mb-3">
              Our Core Philosophy
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-serif font-light text-white">
              The Three Pillars of L&apos;Aube Luxury
            </h2>
            <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2e3192]/20 border border-[#2e3192]/40 text-[#00aeef] flex items-center justify-center font-bold text-2xl">
                👑
              </div>
              <h3 className="text-2xl font-serif font-light text-white">VIP Personalization</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                Every itinerary is tailored to your exact preferences, from private Egyptologist guides to VIP entrance access to iconic ancient monuments.
              </p>
            </Card>

            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f58220]/20 border border-[#f58220]/40 text-[#f58220] flex items-center justify-center font-bold text-2xl">
                🚢
              </div>
              <h3 className="text-2xl font-serif font-light text-white">Luxury Nile Fleet</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                Experience the timeless beauty of the Nile River aboard our partner 5-star luxury cruise ships and private traditional dahabiyas.
              </p>
            </Card>

            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-2xl">
                💎
              </div>
              <h3 className="text-2xl font-serif font-light text-white">Financial Trust & Safety</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                Fully transparent pricing snapshots in base EGP and your home currency, backed by 24/7 VIP concierge support.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="relative rounded-3xl p-12 overflow-hidden text-center flex flex-col items-center justify-center gap-6 shadow-2xl border border-white/10 bg-[#1a1718]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#2e3192]/30 via-[#00aeef]/20 to-[#f58220]/30" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <h2 className="text-3xl sm:text-5xl font-serif font-light text-white tracking-tight">
              Ready to Explore the Secrets of Egypt?
            </h2>
            <div className="h-1 w-16 bg-[#f58220] mx-auto" />
            <p className="max-w-xl text-slate-300 text-base font-light">
              Browse our curated selection of 5-day Nile cruise packages and private Giza Pyramids day tours.
            </p>
            <Link href="/experiences" className="mt-4">
              <Button variant="accent" size="lg">
                Explore All Experiences →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
