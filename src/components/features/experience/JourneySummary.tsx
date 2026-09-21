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
            1. TOP HEADER ROW: TITLE & TYPE BADGE
            ============================================================== */}
        <div className="relative z-10 flex items-center justify-between gap-3 pb-3 sm:pb-3.5 border-b border-slate-200/80 dark:border-accent/20 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Live Pulsing Beacon */}
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

          {/* Luxury Crown Pill Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 dark:border-accent/40 bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent text-xs font-semibold backdrop-blur-xs shadow-2xs shrink-0">
            <CrownIcon className="w-3.5 h-3.5 text-primary dark:text-accent" />
            <span>
              {type === 'package'
                ? dict.get(locale, 'catalog.packageLabel')
                : dict.get(locale, 'catalog.dailyTourLabel')}
            </span>
          </div>
        </div>

        {/* ==============================================================
            2. KEY TRAVEL ESSENTIALS (3 LUXURY CARDS - NEVER CLIPPED)
            ============================================================== */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          
          {/* Item 1: Trip Duration */}
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

          {/* Item 2: Experience Type */}
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

          {/* Item 3: Destinations */}
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

        {/* ==============================================================
            3. ROUTE CORRIDOR (BALANCED, INTENTIONAL TRAJECTORY)
            ============================================================== */}
        {hasRoute && (
          <div className="relative z-10 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-[#1a1614]/80 backdrop-blur-md p-3.5 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
            
            {/* Corridor Sub-Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 dark:border-accent/15 gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <RouteMapIcon className="w-4 h-4 text-primary dark:text-accent shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {dict.get(locale, 'experience.route')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-serif italic hidden sm:inline">
                  {dict.get(locale, 'experience.routeSubtitle', {
                    start: validDestinations[0]?.name || '',
                    end: validDestinations[validDestinations.length - 1]?.name || '',
                  })}
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-border/60 bg-slate-100 dark:bg-card-elevated/80 text-slate-700 dark:text-muted-foreground font-mono text-xs font-semibold shrink-0">
                {dict.get(locale, 'experience.stopsCount', { count: String(validDestinations.length) })}
              </span>
            </div>

            {/* Waypoints Trajectory Track */}
            {/* If exactly 2 stops: gracefully centered with a balanced connection beam */}
            {/* If 3+ stops: smoothly distributed across the container */}
            <div className={`w-full overflow-x-auto no-scrollbar py-1 px-1 flex items-center ${isTwoStops ? 'justify-center' : 'justify-between'} gap-3 sm:gap-6`}>
              <div className={`flex items-center ${isTwoStops ? 'w-full max-w-xl justify-between' : 'w-full justify-between'} gap-2 sm:gap-4 shrink-0`}>
                {validDestinations.map((stop, idx) => {
                  const stopNumber = String(idx + 1).padStart(2, '0')
                  const stopImage =
                    stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`

                  return (
                    <React.Fragment key={stop.id}>
                      {/* Waypoint Node */}
                      <div className="group flex items-center gap-2.5 shrink-0 transition-transform duration-200 hover:scale-105">
                        {/* Circular City Photo with Ring and Stop Number */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-primary/50 dark:border-accent/70 ring-2 sm:ring-3 ring-primary/15 dark:ring-accent/20 overflow-hidden shadow-sm bg-card">
                            <img
                              src={stopImage}
                              alt={stop.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                          <div className="absolute -top-0.5 -right-0.5 rtl:-left-0.5 rtl:right-auto w-4.5 h-4.5 rounded-full bg-[#1a1e4e] text-white dark:bg-[#171514] border border-primary/60 dark:border-accent/70 dark:text-accent font-mono text-[9px] font-bold flex items-center justify-center shadow-xs z-10">
                            {stopNumber}
                          </div>
                        </div>

                        {/* City & Country Text (Crystal Clear) */}
                        <div className="flex flex-col text-start min-w-0">
                          <span className="font-hornbill text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-accent transition-colors">
                            {stop.name}
                          </span>
                          {stop.countryName && (
                            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">
                              {stop.countryName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connection Laser Beam with Transit Arrow */}
                      {idx < validDestinations.length - 1 && (
                        <div className="flex-1 min-w-[36px] sm:min-w-[60px] max-w-[200px] flex items-center justify-center relative px-1 sm:px-2">
                          <div className="w-full h-[2px] bg-primary/25 dark:bg-accent/25 rounded-full relative overflow-hidden">
                            <div
                              className={`absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary dark:via-accent to-transparent ${
                                isRtl ? 'animate-beam-flow-rtl' : 'animate-beam-flow-ltr'
                              } rounded-full`}
                            />
                          </div>
                          <div className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-[#171514] border border-primary/50 dark:border-accent/60 text-primary dark:text-accent flex items-center justify-center shadow-xs ring-1 ring-primary/10 dark:ring-accent/15">
                            <ArrowDirectionIcon
                              className="w-3 h-3 text-primary dark:text-accent"
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

          </div>
        )}

        {/* ==============================================================
            4. SINGLE STOP HUB (If 1 destination)
            ============================================================== */}
        {hasSingleStop && (
          <div className="relative z-10 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-[#1a1614]/80 backdrop-blur-md p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
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
