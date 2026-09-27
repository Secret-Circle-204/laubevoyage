import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Card, Badge, Button } from '@/components/ui'
import { cookies } from 'next/headers'
import { getDomainServices } from '@/domains/factory'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale })

  const [title, description] = await localization.translateBatch([
    "Who We Are | L'Aube Voyage",
    "Learn about L'Aube Voyage, dedicated to delivering bespoke luxury travel, curated private journeys, and exceptional concierge services tailored for discerning travelers."
  ], ctx)

  return {
    title,
    description,
  }
}

// SVG Icons
function CrownIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 9v8.25a2.25 2.25 0 01-2.25 2.25m-16.5 0l3-7.5 4.5 4.5 4.5-4.5 3 7.5" />
    </svg>
  )
}

function ShipIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M12 3v9m0 0l-3.75-3.75M12 12l3.75-3.75M3 18.75c3 0 4.5-1.5 6-1.5s3 1.5 6 1.5 4.5-1.5 6-1.5" />
    </svg>
  )
}

function GemIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

export default async function AboutPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale })

  const rawTexts = [
    "BESPOKE LUXURY", // 0
    "WHO WE ARE", // 1
    "The Art of Curated Luxury Travel", // 2
    "Exceptional Journeys", // 3
    "The Art of", // 4
    "Curated Luxury", // 5
    "Founded with a passion for excellence, L'Aube Voyage crafts bespoke journeys and curated travel experiences. We combine supreme luxury accommodations with dedicated concierge service to deliver unforgettable travels tailored to your highest expectations.", // 6
    "Our Core Philosophy", // 7
    "The Three Pillars of L'Aube Voyage", // 8
    "VIP Personalization", // 9
    "Every itinerary is tailored to your exact preferences, from private curated excursions to exclusive access and seamless VIP services.", // 10
    "Exquisite Hospitality", // 11
    "Experience hand-selected world-class accommodations, prestigious boutique properties, and unparalleled comfort throughout your journey.", // 12
    "Financial Trust & Safety", // 13
    "Fully transparent pricing snapshots in base EGP and your preferred currency, backed by 24/7 dedicated concierge support.", // 14
    "Ready to Begin Your Next Journey?", // 15
    "Browse our curated selection of bespoke packages and exclusive private travel experiences.", // 16
    "Explore All Experiences →" // 17
  ]

  const t = await localization.translateBatch(rawTexts, ctx)

  return (
    <div className="bg-[#231F20] text-slate-100 min-h-screen transition-colors duration-500 overflow-hidden">
      {/* Hero Header */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-[#231F20]">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&q=80&w=2000"
            alt="L'Aube Voyage Luxury Travel"
            fill
            className="object-cover opacity-30 saturate-150 scale-105 transition-transform duration-1000"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#231F20] via-transparent to-[#231F20]/80" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 space-y-6">
          <Badge variant="accent" size="md" className="uppercase font-semibold">
            {t[0]}
          </Badge>
          <h1 className="text-4xl sm:text-7xl font-serif font-light text-white tracking-tight">
            {t[1]}
          </h1>
          <p className="text-lg sm:text-2xl text-slate-300 font-light max-w-2xl mx-auto">
            {t[2]}
          </p>
        </div>
      </section>

      {/* Narrative Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="mb-2">
              {t[3]}
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-serif font-light text-white leading-tight">
              {t[4]} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00aeef] to-[#f58220]">
                {t[5]}
              </span>
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-light">
              {t[6]}
            </p>
          </div>

          <div className="relative h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1200"
              alt="L'Aube Voyage Bespoke Luxury Travel"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Pillars */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="primary" className="mb-3">
              {t[7]}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-serif font-light text-white">
              {t[8]}
            </h2>
            <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2e3192]/20 border border-[#2e3192]/40 text-[#00aeef] flex items-center justify-center font-bold">
                <CrownIcon className="w-7 h-7 text-[#00aeef]" />
              </div>
              <h3 className="text-2xl font-serif font-light text-white">{t[9]}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                {t[10]}
              </p>
            </Card>

            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f58220]/20 border border-[#f58220]/40 text-[#f58220] flex items-center justify-center font-bold">
                <ShipIcon className="w-7 h-7 text-[#f58220]" />
              </div>
              <h3 className="text-2xl font-serif font-light text-white">{t[11]}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                {t[12]}
              </p>
            </Card>

            <Card variant="interactive" padding="lg" className="flex flex-col gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                <GemIcon className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-serif font-light text-white">{t[13]}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                {t[14]}
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="relative rounded-3xl p-12 overflow-hidden text-center flex flex-col items-center justify-center gap-6 shadow-2xl border border-white/10 bg-[#1a1718]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#2e3192]/30 via-[#00aeef]/20 to-[#f58220]/30" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <h2 className="text-3xl sm:text-5xl font-serif font-light text-white tracking-tight">
              {t[15]}
            </h2>
            <div className="h-1 w-16 bg-[#f58220] mx-auto" />
            <p className="max-w-xl text-slate-300 text-base font-light">
              {t[16]}
            </p>
            <Link href="/experiences" className="mt-4">
              <Button variant="accent" size="lg">
                {t[17]}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
