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
  const hasSingleStop = validDestinations.length === 1

  return (
    <section className="animate-editorial-reveal stagger-2">
      {/* MASTER LUXURY CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 dark:border-accent/40 bg-gradient-to-br from-white via-[#f8f9fc] to-[#eef1f9] dark:from-[#1D1815] dark:via-[#1A1614] dark:to-[#171514] text-foreground shadow-lg dark:shadow-2xl p-6 sm:p-8 flex flex-col gap-6 transition-colors duration-300">
        {/* Gallery Hero Background Image (Dark Mode Only) */}
        {backgroundImage && (
          <div
            className="hidden dark:block absolute top-0 right-0 rtl:right-auto rtl:left-0 w-full sm:w-2/3 h-64 sm:h-72 pointer-events-none overflow-hidden select-none"
            aria-hidden="true"
          >
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover object-center opacity-35"
            />
            {/* Horizontal Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-[#1D1815] via-[#1A1614]/70 to-transparent" />
            {/* Vertical Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1A1614]/60 to-[#1A1614]" />
          </div>
        )}

        {/* Ambient Corner Accent Glow */}
        <div
          className="absolute -top-20 -left-20 rtl:-right-20 rtl:-left-auto w-72 h-72 rounded-full bg-primary/8 dark:bg-accent/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 -right-20 rtl:-left-20 rtl:-right-auto w-64 h-64 rounded-full bg-secondary/10 dark:bg-accent/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        {/* ==================================================================
            1. TOP HEADER ROW: TITLE & TYPE BADGE
            ================================================================== */}
        <div className="relative z-10 flex items-center justify-between pb-5 border-b border-primary/15 dark:border-accent/15 gap-3 flex-wrap">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              {/* Pulsing Live Beacon */}
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary dark:bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary dark:bg-accent" />
              </div>
              <span className="text-xs uppercase font-bold text-[#1a1e4e] dark:text-accent font-mono tracking-widest">
                {dict.get(locale, 'experience.journeyOverview')}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-muted-foreground/75 mt-1">
              • TIMELESS DESTINATIONS • EXTRAORDINARY EXPERIENCES
            </span>
          </div>

          {/* Luxury Crown Pill Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-accent/40 bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent font-mono text-xs font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs">
            <CrownIcon className="w-3.5 h-3.5 text-primary dark:text-accent" />
            <span>
              {type === 'package'
                ? dict.get(locale, 'catalog.packageLabel')
                : dict.get(locale, 'catalog.dailyTourLabel')}
            </span>
          </div>
        </div>

        {/* ==================================================================
            2. TRAVEL ESSENTIALS (3 LUXURY COLUMNS - ICON ON TOP)
            ================================================================== */}
        <div className="relative z-10 rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-card/60 backdrop-blur-md p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-accent/15 rtl:divide-x-reverse shadow-xs">
          {/* Item 1: Trip Duration */}
          <div className="flex flex-col items-start gap-2.5 pt-3 sm:pt-0 sm:pe-5">
            <div className="w-10 h-10 rounded-xl bg-primary text-white dark:rounded-full dark:border dark:border-accent/40 dark:bg-accent/10 dark:text-accent flex items-center justify-center shrink-0 ring-2 ring-primary/15 dark:ring-accent/15 shadow-xs">
              <CalendarIcon className="w-5 h-5 text-white dark:text-accent" />
            </div>
            <div className="flex flex-col w-full text-start">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-bold block">
                {dict.get(locale, 'experience.tripDuration').replace(/:$/, '')}
              </span>
              <span className="font-hornbill text-lg sm:text-xl font-bold text-foreground block leading-tight mt-0.5">
                {formattedDuration}
              </span>
            </div>
          </div>

          {/* Item 2: Experience Type */}
          <div className="flex flex-col items-start gap-2.5 pt-5 sm:pt-0 sm:px-6">
            <div className="w-10 h-10 rounded-xl bg-primary text-white dark:rounded-full dark:border dark:border-accent/40 dark:bg-accent/10 dark:text-accent flex items-center justify-center shrink-0 ring-2 ring-primary/15 dark:ring-accent/15 shadow-xs">
              <CompassIcon className="w-5 h-5 text-white dark:text-accent" />
            </div>
            <div className="flex flex-col w-full text-start">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-bold block">
                {dict.get(locale, 'experience.experienceType')}
              </span>
              <span className="font-hornbill text-lg sm:text-xl font-bold text-foreground block leading-tight mt-0.5">
                {type === 'package'
                  ? dict.get(locale, 'catalog.packageLabel')
                  : dict.get(locale, 'catalog.dailyTourLabel')}
              </span>
            </div>
          </div>

          {/* Item 3: Destinations */}
          <div className="flex flex-col items-start gap-2.5 pt-5 sm:pt-0 sm:ps-6">
            <div className="w-10 h-10 rounded-xl bg-primary text-white dark:rounded-full dark:border dark:border-accent/40 dark:bg-accent/10 dark:text-accent flex items-center justify-center shrink-0 ring-2 ring-primary/15 dark:ring-accent/15 shadow-xs">
              <LocationPinIcon className="w-5 h-5 text-white dark:text-accent" />
            </div>
            <div className="flex flex-col w-full text-start">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-bold block">
                {dict.get(locale, 'experience.destinations')}
              </span>
              <span className="font-hornbill text-lg sm:text-xl font-bold text-foreground block leading-tight mt-0.5">
                {location}
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================================
            3. ROUTE CORRIDOR SUB-CARD (WAYPOINTS & SMOOTH CONTINUOUS TRAJECTORY)
            ================================================================== */}
        {hasRoute && (
          <div className="relative z-10 rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-card/60 backdrop-blur-md p-5 sm:p-7 flex flex-col gap-6 shadow-xs">
            {/* Sub-Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-accent/15 gap-3 flex-wrap">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <RouteMapIcon className="w-4 h-4 text-primary dark:text-accent" />
                  <span className="text-xs sm:text-sm font-mono uppercase font-bold text-[#1a1e4e] dark:text-accent tracking-widest">
                    {dict.get(locale, 'experience.route')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 font-serif italic mt-1">
                  {dict.get(locale, 'experience.routeSubtitle', {
                    start: validDestinations[0]?.name || '',
                    end: validDestinations[validDestinations.length - 1]?.name || '',
                  })}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-border/60 bg-white dark:bg-card-elevated/80 text-foreground dark:text-muted-foreground font-mono text-xs font-semibold shadow-2xs">
                {validDestinations.length} {isRtl ? 'محطات' : 'Stops'}
              </span>
            </div>

            {/* DESKTOP & TABLET: Horizontal Waypoint Corridor (Smart Adaptive Scaling) */}
            <div className="hidden sm:flex items-center justify-between w-full max-w-full pt-2 pb-1">
              {validDestinations.map((stop, idx) => {
                const stopCount = validDestinations.length
                const stopNumber = String(idx + 1).padStart(2, '0')
                const stopImage =
                  stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`

                // Dynamic adaptive sizing tokens based on stop count
                const isTwoStops = stopCount <= 2
                const isThreeStops = stopCount === 3

                const avatarSizeClass = isTwoStops
                  ? 'w-14 h-14 sm:w-16 sm:h-16'
                  : isThreeStops
                    ? 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12'
                    : 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10'

                const badgeSizeClass = isTwoStops
                  ? 'w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-[11px] -top-1 -right-1 rtl:-left-1 rtl:right-auto'
                  : isThreeStops
                    ? 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-[8px] sm:text-[9px] -top-0.5 -right-0.5 rtl:-left-0.5 rtl:right-auto'
                    : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[7px] sm:text-[8px] -top-0.5 -right-0.5 rtl:-left-0.5 rtl:right-auto'

                const cityNameSizeClass = isTwoStops
                  ? 'text-sm sm:text-base md:text-lg'
                  : isThreeStops
                    ? 'text-xs sm:text-sm'
                    : 'text-[11px] sm:text-xs'

                const countryNameSizeClass = isTwoStops
                  ? 'text-[11px] sm:text-xs'
                  : isThreeStops
                    ? 'text-[10px] sm:text-[11px]'
                    : 'text-[9px] sm:text-[10px]'

                const arrowContainerSizeClass = isTwoStops
                  ? 'w-7 h-7 sm:w-8 sm:h-8'
                  : isThreeStops
                    ? 'w-5.5 h-5.5 sm:w-6.5 sm:h-6.5'
                    : 'w-4.5 h-4.5 sm:w-5 sm:h-5'

                const arrowIconSizeClass = isTwoStops
                  ? 'w-3.5 h-3.5 sm:w-4 sm:h-4'
                  : isThreeStops
                    ? 'w-2.5 h-2.5 sm:w-3 sm:h-3'
                    : 'w-2 h-2 sm:w-2.5 sm:h-2.5'

                const nodeGapClass = isTwoStops
                  ? 'gap-2.5 sm:gap-3'
                  : isThreeStops
                    ? 'gap-1.5 sm:gap-2'
                    : 'gap-1 sm:gap-1.5'

                const nodeMaxWidthClass = isTwoStops
                  ? 'max-w-[40%]'
                  : isThreeStops
                    ? 'max-w-[28%]'
                    : 'max-w-[22%]'

                return (
                  <React.Fragment key={stop.id}>
                    {/* Waypoint Hub Node (Adaptive Sizing & Fluid Bounding) */}
                    <div
                      className={`group flex items-center ${nodeGapClass} shrink min-w-0 ${nodeMaxWidthClass} transition-transform duration-300 hover:scale-105`}
                    >
                      {/* Relative Photo Container with Dynamic Corner Badge */}
                      <div className="relative shrink-0">
                        {/* Circular City Photo */}
                        <div
                          className={`${avatarSizeClass} rounded-full border-2 border-primary dark:border-accent ring-2 sm:ring-4 ring-primary/20 dark:ring-accent/20 overflow-hidden shadow-sm bg-card`}
                        >
                          <img
                            src={stopImage}
                            alt={stop.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>

                        {/* Attached Waypoint Number Badge */}
                        <div
                          className={`absolute ${badgeSizeClass} rounded-full bg-[#1a1e4e] text-white dark:bg-[#171514] border-2 border-primary dark:border-accent dark:text-accent font-mono font-bold flex items-center justify-center shadow-xs z-20`}
                          aria-hidden="true"
                        >
                          {stopNumber}
                        </div>
                      </div>

                      {/* City Name & Country Stack (Truncates safely within container) */}
                      <div className="flex flex-col text-start min-w-0 overflow-hidden">
                        <span
                          className={`font-hornbill ${cityNameSizeClass} font-bold text-foreground leading-tight truncate transition-colors group-hover:text-primary dark:group-hover:text-accent`}
                        >
                          {stop.name}
                        </span>
                        {stop.countryName && (
                          <span
                            className={`${countryNameSizeClass} text-muted-foreground font-medium truncate mt-0.5`}
                          >
                            {stop.countryName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Smooth Continuous Trajectory Line with Directional Arrow */}
                    {idx < validDestinations.length - 1 && (
                      <div className="relative flex-1 min-w-[12px] sm:min-w-[16px] mx-1 flex items-center justify-center shrink">
                        {/* Base Track with Flowing Energy Pulse */}
                        <div className="w-full h-[2px] bg-primary/20 dark:bg-accent/20 rounded-full relative overflow-hidden">
                          {/* Flowing Energy Beam */}
                          <div
                            className={`absolute inset-y-0 w-3/5 bg-gradient-to-r ${
                              isRtl
                                ? 'from-transparent via-primary dark:via-accent to-transparent animate-beam-flow-rtl'
                                : 'from-transparent via-primary dark:via-accent to-transparent animate-beam-flow-ltr'
                            } rounded-full`}
                          />
                        </div>

                        {/* Directional Arrow Badge looking towards next stop */}
                        <div
                          className={`absolute ${arrowContainerSizeClass} rounded-full bg-white dark:bg-[#171514] border border-primary/50 dark:border-accent/70 text-primary dark:text-accent flex items-center justify-center shadow-xs ring-1.5 sm:ring-2 ring-primary/20 dark:ring-accent/20 z-10 transition-transform duration-300 hover:scale-110`}
                          aria-label="Direction of travel"
                        >
                          <ArrowDirectionIcon
                            className={`${arrowIconSizeClass} text-primary dark:text-accent`}
                            isRtl={isRtl}
                            direction="horizontal"
                          />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* MOBILE: Clean Vertical Route Rail */}
            <div className="flex sm:hidden flex-col gap-4 pt-2">
              {validDestinations.map((stop, idx) => {
                const stopNumber = String(idx + 1).padStart(2, '0')
                const stopImage =
                  stop.imageUrl || `/media-assets/destinations/city-hero-${stop.slug}.jpg`

                return (
                  <React.Fragment key={stop.id}>
                    <div className="flex items-center gap-3">
                      {/* Circular Photo with unclipped badge */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full border-2 border-primary dark:border-accent ring-2 ring-primary/20 dark:ring-accent/20 overflow-hidden shadow-md bg-card">
                          <img
                            src={stopImage}
                            alt={stop.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto w-5 h-5 rounded-full bg-[#1a1e4e] text-white dark:bg-[#171514] border-2 border-primary dark:border-accent dark:text-accent font-mono text-[10px] font-bold flex items-center justify-center shadow-md z-20">
                          {stopNumber}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <span className="font-hornbill text-base font-bold text-foreground">
                          {stop.name}
                        </span>
                        {stop.countryName && (
                          <span className="text-xs text-muted-foreground">{stop.countryName}</span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Center Connector with Flowing Energy Pulse and Downward Arrow */}
                    {idx < validDestinations.length - 1 && (
                      <div className="relative py-2 flex items-center justify-center">
                        <div className="w-full h-[2px] bg-primary/20 dark:bg-accent/20 rounded-full relative overflow-hidden">
                          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary dark:via-accent to-transparent animate-beam-flow-ltr rounded-full" />
                        </div>
                        <div className="absolute w-6.5 h-6.5 rounded-full bg-white dark:bg-[#171514] border border-primary/50 dark:border-accent/60 text-primary dark:text-accent flex items-center justify-center shadow-xs">
                          <ArrowDirectionIcon
                            className="w-3.5 h-3.5 text-primary dark:text-accent"
                            direction="down"
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

        {/* Single-City Hub Display (If only 1 destination is present) */}
        {hasSingleStop && (
          <div className="relative z-10 rounded-2xl border border-slate-200/80 dark:border-accent/20 bg-white/90 dark:bg-card/60 backdrop-blur-md p-4 sm:p-5 flex items-center gap-3.5 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-primary text-white dark:rounded-full dark:border dark:border-accent/40 dark:bg-accent/10 dark:text-accent flex items-center justify-center shrink-0 ring-2 ring-primary/15 dark:ring-accent/15">
              <LocationPinIcon className="w-5 h-5 text-white dark:text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-primary dark:text-accent font-mono tracking-wider">
                {dict.get(locale, 'experience.destinations')}
              </span>
              <span className="font-hornbill text-base font-bold text-foreground">
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
