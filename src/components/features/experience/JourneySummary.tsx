'use client'

import React from 'react'
import type { DestinationStopDTO } from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function isValidStop(stop: DestinationStopDTO): boolean {
  return Boolean(
    stop &&
    typeof stop.id === 'number' &&
    typeof stop.name === 'string' &&
    stop.name.trim().length > 0,
  )
}

export interface JourneySummaryProps {
  formattedDuration: string
  location: string
  type: 'package' | 'daily_tour'
  destinations?: DestinationStopDTO[]
  descriptionHtml?: string
  backgroundImage?: string
  locale: string
}

/* ==========================================================================
   LUXURY BRAND SVG ICONS
   ========================================================================== */

function CrownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <circle cx="16" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function CompassIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon
        points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
        fill="currentColor"
      />
    </svg>
  )
}

function LocationPinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" fill="currentColor" />
    </svg>
  )
}

function RouteMapIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function ArrowDirectionIcon({
  className = 'w-3.5 h-3.5',
  isRtl = false,
  direction = 'horizontal',
}: {
  className?: string
  isRtl?: boolean
  direction?: 'horizontal' | 'down'
}) {
  if (direction === 'down') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 4v16m0 0l-5-5m5 5l5-5" />
      </svg>
    )
  }

  return (
    <svg
      className={`${className} ${isRtl ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h16m0 0l-5-5m5 5l-5 5" />
    </svg>
  )
}

function CartographicTopoOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.05] dark:opacity-[0.08]"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 500 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-50 80 C 120 40, 220 160, 550 90"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <path
          d="M-50 160 C 80 110, 280 230, 550 170"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-50 260 C 140 210, 200 320, 550 280"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <path
          d="M-50 370 C 100 310, 310 420, 550 380"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-50 490 C 160 430, 230 550, 550 490"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <path
          d="M-50 610 C 110 560, 320 670, 550 620"
          stroke="currentColor"
          strokeWidth="1"
        />
        <g transform="translate(430, 80) scale(0.65)" opacity="0.6">
          <circle cx="0" cy="0" r="30" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="0" r="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="-34" y1="0" x2="34" y2="0" stroke="currentColor" strokeWidth="0.8" />
          <line x1="0" y1="-34" x2="0" y2="34" stroke="currentColor" strokeWidth="0.8" />
          <polygon points="0,-24 4,-8 0,-12 -4,-8" fill="currentColor" />
          <polygon points="0,24 4,8 0,12 -4,8" fill="currentColor" />
          <polygon points="-24,0 -8,4 -12,0 -8,-4" fill="currentColor" />
          <polygon points="24,0 8,4 12,0 8,-4" fill="currentColor" />
          <circle cx="0" cy="0" r="2" fill="currentColor" />
        </g>
      </svg>
    </div>
  )
}


export function JourneySummary({
  formattedDuration,
  location,
  type,
  destinations,
  backgroundImage,
  locale,
}: JourneySummaryProps) {
  const isRtl = locale === 'ar'
  const validDestinations = Array.isArray(destinations) ? destinations.filter(isValidStop) : []
  const hasRoute = validDestinations.length > 1
  const isTwoStops = validDestinations.length === 2
  const hasManyStops = validDestinations.length > 2
  const hasSingleStop = validDestinations.length === 1

  return (
    <section className="animate-editorial-reveal stagger-2 my-8 sm:my-10 lg:my-12">
      {/* MASTER LUXURY OVERVIEW CARD */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 dark:border-accent/40 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/80 dark:from-[#171412] dark:via-[#141110] dark:to-[#100e0d] text-foreground shadow-sm dark:shadow-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 transition-all duration-300">
        
        {/* Ambient Dark Mode Hero Silhouette */}
        {backgroundImage && (
          <div
            className="hidden dark:block absolute top-0 right-0 rtl:right-auto rtl:left-0 w-full sm:w-2/3 h-52 pointer-events-none overflow-hidden select-none opacity-20"
            aria-hidden="true"
          >
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-[#171412] via-[#141110]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141110]/70 to-[#100e0d]" />
          </div>
        )}

        {/* Ambient Glows */}
        <div
          className="absolute -top-16 -left-16 rtl:-right-16 rtl:-left-auto w-48 h-48 rounded-full bg-primary/10 dark:bg-accent/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-16 -right-16 rtl:-left-16 rtl:-right-auto w-48 h-48 rounded-full bg-secondary/10 dark:bg-accent/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* ==============================================================
            [COMMENTED OUT PER USER REQUEST: REDUNDANT WITH HERO BANNER]
            1. TOP HEADER ROW: TITLE & TYPE BADGE
            2. KEY TRAVEL ESSENTIALS (3 LUXURY CARDS)
            ============================================================== */}
        {/*
        <div className="relative z-10 flex items-center justify-between gap-3 pb-3 sm:pb-3.5 border-b border-slate-200/80 dark:border-accent/20 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary dark:bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary dark:bg-accent" />
            </div>
            <h3 className="font-hornbill text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-wide">
              {dict.get(locale, 'experience.journeyOverview')}
            </h3>
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 font-normal">
              • {dict.get(locale, 'experience.summaryTagline')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 dark:border-accent/40 bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent text-xs font-semibold backdrop-blur-xs shadow-2xs shrink-0">
            <CrownIcon className="w-3.5 h-3.5 text-primary dark:text-accent" />
            <span>
              {type === 'package'
                ? dict.get(locale, 'catalog.packageLabel')
                : dict.get(locale, 'catalog.dailyTourLabel')}
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-[#1a1614]/80 backdrop-blur-md p-3 sm:p-4 flex items-center gap-3 shadow-2xs transition-all hover:border-primary/40 dark:hover:border-accent/40">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent border border-primary/15 dark:border-accent/20 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary dark:text-accent" />
            </div>
            <div className="flex flex-col min-w-0 text-start">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {dict.get(locale, 'experience.tripDuration')?.replace(/:$/, '')}
              </span>
              <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {formattedDuration}
              </span>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-[#1a1614]/80 backdrop-blur-md p-3 sm:p-4 flex items-center gap-3 shadow-2xs transition-all hover:border-primary/40 dark:hover:border-accent/40">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent border border-primary/15 dark:border-accent/20 flex items-center justify-center shrink-0">
              <CompassIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary dark:text-accent" />
            </div>
            <div className="flex flex-col min-w-0 text-start">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {dict.get(locale, 'experience.experienceType')}
              </span>
              <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {type === 'package'
                  ? dict.get(locale, 'catalog.packageLabel')
                  : dict.get(locale, 'catalog.dailyTourLabel')}
              </span>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-[#1a1614]/80 backdrop-blur-md p-3 sm:p-4 flex items-center gap-3 shadow-2xs transition-all hover:border-primary/40 dark:hover:border-accent/40">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent border border-primary/15 dark:border-accent/20 flex items-center justify-center shrink-0">
              <LocationPinIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary dark:text-accent" />
            </div>
            <div className="flex flex-col min-w-0 text-start">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {dict.get(locale, 'experience.destinations')}
              </span>
              <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {location}
              </span>
            </div>
          </div>
        </div>
        */}

        {/* ==============================================================
            3. ROUTE CORRIDOR (ADAPTIVE LUXURY TRAJECTORY)
            ============================================================== */}
        {hasRoute && (
          <div className="relative z-10 w-full flex flex-col gap-3.5 sm:gap-6">
            {/* Ambient Cartographic Topo Overlay */}
            <CartographicTopoOverlay />
            
            {/* Corridor Sub-Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-accent/15 gap-2 flex-wrap relative z-10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent flex items-center justify-center shrink-0">
                  <RouteMapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-xs sm:text-base font-bold text-slate-900 dark:text-white tracking-wide shrink-0">
                    {dict.get(locale, 'experience.route')}
                  </span>
                  <span className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-serif italic truncate max-w-[170px] sm:max-w-none">
                    • {dict.get(locale, 'experience.routeSubtitle', {
                      start: validDestinations[0]?.name || '',
                      end: validDestinations[validDestinations.length - 1]?.name || '',
                    })}
                  </span>
                </div>
              </div>

              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-200 dark:border-border/60 bg-slate-100 dark:bg-card-elevated/80 text-slate-700 dark:text-muted-foreground font-mono text-[10px] sm:text-xs font-semibold shrink-0">
                {dict.get(locale, 'experience.stopsCount', { count: String(validDestinations.length) })}
              </span>
            </div>

            {/* ==============================================================
                A. MOBILE VIEW (< md): SINUOUS CARTOGRAPHIC EXPEDITION TRAIL
                (Universal for 2, 3, 4, 5, 6+ stops)
                ============================================================== */}
            <div className="flex md:hidden flex-col w-full py-2 px-0.5 relative z-10">
                  {validDestinations.map((stop, idx) => {
                    const stopNumber = String(idx + 1).padStart(2, '0')
                    const stopImage =
                      stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`
                    const isLast = idx === validDestinations.length - 1

                    // Alternating Sinuous Trail:
                    // In LTR: idx 0 is Left, idx 1 is Right, idx 2 is Left...
                    // In RTL: idx 0 is Right, idx 1 is Left, idx 2 is Right...
                    const sitsOnLeft = isRtl ? idx % 2 === 1 : idx % 2 === 0
                    const isHeadingRight = sitsOnLeft

                    // Sinuous Bezier Curve:
                    // If heading right: begins on Left (x ≈ 14%), lands on Right (x ≈ 86%)
                    // If heading left: begins on Right (x ≈ 86%), lands on Left (x ≈ 14%)
                    const pathD = isHeadingRight
                      ? 'M 14 0 C 14 36, 86 12, 86 48'
                      : 'M 86 0 C 86 36, 14 12, 14 48'

                    return (
                      <React.Fragment key={stop.id}>
                        {/* Waypoint Station Card */}
                        <div
                          className={`w-[86%] sm:w-[80%] flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 relative z-10 ${
                            sitsOnLeft
                              ? 'mr-auto self-start flex-row text-start'
                              : 'ml-auto self-end flex-row-reverse text-end'
                          } border-slate-200/90 dark:border-accent/30 bg-white/95 dark:bg-[#181412]/95 backdrop-blur-md shadow-sm dark:shadow-md hover:border-primary/50 dark:hover:border-accent/60`}
                        >
                          {/* Waypoint City Avatar Node */}
                          <div className="relative shrink-0">
                            <div className="w-13 h-13 rounded-full border-2 border-primary/60 dark:border-accent/80 ring-2 ring-primary/15 dark:ring-accent/25 overflow-hidden shadow-md bg-card relative">
                              <img
                                src={stopImage}
                                alt={stop.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>

                            {/* Stop Number Badge */}
                            <div
                              className={`absolute -top-1 ${
                                sitsOnLeft ? '-right-1' : '-left-1'
                              } w-5 h-5 rounded-full border border-white dark:border-[#171412] font-mono text-[9px] font-extrabold flex items-center justify-center shadow-sm z-10 bg-primary text-white dark:bg-accent dark:text-[#171412]`}
                            >
                              {stopNumber}
                            </div>
                          </div>

                          {/* Waypoint Details */}
                          <div className="flex flex-col min-w-0 flex-1">
                            {/* City Title */}
                            <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                              {stop.name}
                            </span>

                            {/* Country */}
                            {stop.countryName && (
                              <span
                                className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5 flex items-center gap-1 ${
                                  sitsOnLeft ? 'justify-start' : 'justify-end'
                                }`}
                              >
                                <LocationPinIcon className="w-3 h-3 text-primary dark:text-accent shrink-0" />
                                <span className="truncate">{stop.countryName}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sinuous Curved Connecting Arc */}
                        {!isLast && (
                          <div className="w-full h-14 sm:h-16 relative flex items-center justify-center my-0.5">
                            {/* SVG Bezier Route Path */}
                            <svg
                              className="w-full h-full overflow-visible"
                              viewBox="0 0 100 48"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              <defs>
                                <linearGradient id={`trailGrad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="var(--primary, #00aeef)" stopOpacity="0.4" />
                                  <stop offset="50%" stopColor="#c9a050" stopOpacity="1" />
                                  <stop offset="100%" stopColor="var(--primary, #00aeef)" stopOpacity="0.4" />
                                </linearGradient>
                              </defs>

                              {/* Underlying Dashed Cartographic Guideline */}
                              <path
                                d={pathD}
                                fill="none"
                                stroke="rgba(201, 160, 80, 0.25)"
                                strokeWidth="2.5"
                                strokeDasharray="4 4"
                                vectorEffect="non-scaling-stroke"
                              />

                              {/* Glowing Dynamic Navigation Dash Line */}
                              <path
                                d={pathD}
                                fill="none"
                                stroke={`url(#trailGrad-${idx})`}
                                strokeWidth="2.5"
                                strokeDasharray="8 6"
                                className="animate-route-dash"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>

                            {/* Central Leg Transit Capsule */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#191513]/95 border border-primary/30 dark:border-accent/40 shadow-lg shadow-black/10 dark:shadow-black/50 backdrop-blur-md">
                                <span className="font-mono text-[10px] font-extrabold text-slate-800 dark:text-accent">
                                  {stopNumber}
                                </span>
                                <svg
                                  className={`w-3.5 h-3.5 text-primary dark:text-accent transform transition-transform ${
                                    isHeadingRight ? 'rotate-45' : 'rotate-[135deg]'
                                  }`}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                  <polyline points="12 5 19 12 12 19" />
                                </svg>
                                <span className="font-mono text-[10px] font-extrabold text-slate-800 dark:text-accent">
                                  {String(idx + 2).padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

            {/* ==============================================================
                B. DESKTOP VIEW (>= md): EXPANSIVE HORIZONTAL CORRIDOR
                ============================================================== */}
            {hasManyStops ? (
              /* Desktop for 3+ stops */
              <div className="hidden md:flex w-full py-2 px-1 items-center justify-center">
                <div className="flex items-center justify-between w-full max-w-5xl gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {validDestinations.map((stop, idx) => {
                    const stopNumber = String(idx + 1).padStart(2, '0')
                    const stopImage =
                      stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`

                    return (
                      <React.Fragment key={stop.id}>
                        {/* Waypoint Node */}
                        <div className="group flex items-center gap-2.5 shrink-0 transition-transform duration-200 hover:scale-105">
                          <div className="relative shrink-0">
                            <div className="w-13 h-13 rounded-full border-2 border-primary/60 dark:border-accent/80 ring-3 ring-primary/15 dark:ring-accent/25 overflow-hidden shadow-md bg-card">
                              <img
                                src={stopImage}
                                alt={stop.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-5 h-5 rounded-full bg-primary text-white dark:bg-accent dark:text-[#171412] border border-white dark:border-[#171412] font-mono text-[10px] font-extrabold flex items-center justify-center shadow-sm z-10">
                              {stopNumber}
                            </div>
                          </div>

                          <div className="flex flex-col text-start min-w-0">
                            <span className="font-hornbill text-sm md:text-base font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-accent transition-colors">
                              {stop.name}
                            </span>
                            {stop.countryName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">
                                {stop.countryName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Horizontal Connection Beam */}
                        {idx < validDestinations.length - 1 && (
                          <div className="flex-1 min-w-[40px] max-w-[160px] flex items-center justify-center relative px-2">
                            <div className="w-full h-[3.5px] bg-slate-200/90 dark:bg-white/10 rounded-full relative overflow-hidden shadow-inner">
                              <div
                                className={`absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-primary dark:via-accent to-transparent shadow-[0_0_8px_rgba(0,174,239,0.85)] dark:shadow-[0_0_14px_rgba(201,160,80,0.95)] ${
                                  isRtl ? 'animate-beam-flow-rtl' : 'animate-beam-flow-ltr'
                                } rounded-full`}
                              />
                            </div>
                            <div className="absolute w-7 h-7 rounded-full bg-white dark:bg-[#1a1614] border-2 border-primary dark:border-accent text-primary dark:text-accent flex items-center justify-center shadow-md ring-2 ring-primary/10 dark:ring-accent/20 z-10">
                              <ArrowDirectionIcon
                                className="w-3.5 h-3.5 text-primary dark:text-accent stroke-[2.5]"
                                isRtl={isRtl}
                              />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Desktop for 2 stops */
              <div className="hidden md:flex w-full py-2 sm:py-3 items-center justify-center">
                <div className="flex items-center w-full max-w-3xl justify-between px-6 gap-6">
                  {validDestinations.map((stop, idx) => {
                    const stopNumber = String(idx + 1).padStart(2, '0')
                    const stopImage =
                      stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`

                    return (
                      <React.Fragment key={stop.id}>
                        {/* Waypoint Node */}
                        <div className="group flex items-center text-start gap-3 shrink-0 transition-transform duration-200 hover:scale-105">
                          {/* Circular City Photo with Ring and Stop Number */}
                          <div className="relative shrink-0">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-primary/60 dark:border-accent/80 ring-4 ring-primary/15 dark:ring-accent/25 overflow-hidden shadow-md bg-card">
                              <img
                                src={stopImage}
                                alt={stop.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-5.5 h-5.5 rounded-full bg-primary text-white dark:bg-accent dark:text-[#171412] border border-white dark:border-[#171412] font-mono text-[11px] font-extrabold flex items-center justify-center shadow-sm z-10">
                              {stopNumber}
                            </div>
                          </div>

                          {/* City & Country Text */}
                          <div className="flex flex-col min-w-0">
                            <span className="font-hornbill text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-accent transition-colors">
                              {stop.name}
                            </span>
                            {stop.countryName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                                {stop.countryName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Connection Laser Beam with Transit Arrow */}
                        {idx < validDestinations.length - 1 && (
                          <div className="flex-1 min-w-[120px] md:min-w-[200px] flex items-center justify-center relative px-4">
                            {/* Base Trajectory Rail */}
                            <div className="w-full h-[4px] bg-slate-200/90 dark:bg-white/10 rounded-full relative overflow-hidden shadow-inner">
                              {/* Animated High-Luminosity Laser Pulse */}
                              <div
                                className={`absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-primary dark:via-accent to-transparent shadow-[0_0_8px_rgba(0,174,239,0.85)] dark:shadow-[0_0_14px_rgba(201,160,80,0.95)] ${
                                  isRtl ? 'animate-beam-flow-rtl' : 'animate-beam-flow-ltr'
                                } rounded-full`}
                              />
                            </div>

                            {/* Center Transit Arrow Node */}
                            <div className="absolute w-8 h-8 rounded-full bg-white dark:bg-[#1a1614] border-2 border-primary dark:border-accent text-primary dark:text-accent flex items-center justify-center shadow-md ring-4 ring-primary/10 dark:ring-accent/20 z-10 transition-transform duration-300 hover:scale-110">
                              <ArrowDirectionIcon
                                className="w-3.5 h-3.5 text-primary dark:text-accent stroke-[2.5]"
                                isRtl={isRtl}
                              />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==============================================================
            4. SINGLE STOP HUB (If 1 destination)
            ============================================================== */}
        {hasSingleStop && (
          <div className="relative z-10 w-full flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent border border-primary/15 dark:border-accent/20 flex items-center justify-center shrink-0">
              <LocationPinIcon className="w-4.5 h-4.5 text-primary dark:text-accent" />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-[11px] font-semibold text-primary dark:text-accent uppercase tracking-wider">
                {dict.get(locale, 'experience.destinationSingle')}
              </span>
              <span className="font-hornbill text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {validDestinations[0].name}
                {validDestinations[0].countryName ? ` • ${validDestinations[0].countryName}` : ''}
              </span>
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
