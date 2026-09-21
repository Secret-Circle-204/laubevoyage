'use client'

import React, { useState } from 'react'
import type { ItineraryDayDTO } from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

/* ==========================================================================
   LUXURY BRAND SVG ICONS
   ========================================================================== */

function DiningIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a3 3 0 016 0v5a3 3 0 01-6 0v-5z" />
    </svg>
  )
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CompassRosetteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
    </svg>
  )
}

export interface JourneyItineraryProps {
  itinerary: ItineraryDayDTO[]
  locale: string
}

export function JourneyItinerary({ itinerary, locale }: JourneyItineraryProps) {
  const isRtl = locale === 'ar'

  // Requirement: First day is expanded automatically on initial render
  // Single active day: Expanding any day collapses previously open day automatically
  const [activeDayNumber, setActiveDayNumber] = useState<number | null>(() => {
    return itinerary && itinerary.length > 0 ? itinerary[0].dayNumber : 1
  })

  // Mouse drag-to-scroll state & handlers
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [dragMoved, setDragMoved] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setDragMoved(false)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    if (Math.abs(walk) > 4) {
      setDragMoved(true)
    }
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  if (!itinerary || itinerary.length === 0) return null

  const handleToggleDay = (dayNum: number) => {
    setActiveDayNumber((prev) => (prev === dayNum ? null : dayNum))
  }

  const handleJumpToDay = (dayNum: number) => {
    setActiveDayNumber(dayNum)
    // Smooth scroll to target day element if in view
    const elem = document.getElementById(`itinerary-day-${dayNum}`)
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <section className="animate-editorial-reveal stagger-3">
      {/* ==============================================================
          1. SECTION HEADER & QUICK ROADMAP OVERVIEW
          ============================================================== */}
      <div className="flex flex-col gap-4 mb-8 pb-5 border-b border-slate-200/80 dark:border-accent/20">
        
        {/* Main Title Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Live Pulsing Beacon */}
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary dark:bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary dark:bg-accent" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-hornbill font-bold text-slate-900 dark:text-white leading-tight">
                {dict.get(locale, 'experience.itineraryTitle')}
              </h2>
            </div>
          </div>

          {/* Days Count Pill Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-accent/40 bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent text-xs font-semibold backdrop-blur-xs shadow-2xs">
            <CompassRosetteIcon className="w-3.5 h-3.5 text-primary dark:text-accent" />
            <span>
              {itinerary.length === 1
                ? dict.get(locale, 'experience.dayJourneySingle')
                : dict.get(locale, 'experience.daysCount', { count: String(itinerary.length) })}
            </span>
          </div>
        </div>

        {/* 2. SMART ROADMAP JUMP STRIP (Quick Interactive Navigator - Drag to Scroll & Touch Swipe) */}
        {itinerary.length > 1 && (
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 uppercase tracking-wider hidden sm:inline select-none">
              {dict.get(locale, 'experience.quickJump')}
            </span>
            {itinerary.map((day) => {
              const isSelected = activeDayNumber === day.dayNumber
              const dayLabel = String(day.dayNumber).padStart(2, '0')

              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => {
                    if (!dragMoved) {
                      handleJumpToDay(day.dayNumber)
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-primary text-white dark:bg-accent dark:text-[#171412] shadow-sm ring-2 ring-primary/20 dark:ring-accent/30 scale-105'
                      : 'bg-slate-100 text-slate-700 dark:bg-[#1a1614] dark:text-white hover:bg-slate-200 dark:hover:bg-[#231e1b] hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/10 shadow-2xs'
                  }`}
                  aria-label={`Jump to Day ${day.dayNumber}`}
                >
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{dayLabel}</span>
                  <span className="truncate max-w-[80px] sm:max-w-[110px]">
                    {day.location || dict.get(locale, 'experience.itineraryDay', { day: String(day.dayNumber) })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ==============================================================
          3. EXPEDITION CHRONICLE TIMELINE (MATHEMATICALLY CENTERED SPINE)
          ============================================================== */}
      <div className="relative space-y-6 sm:space-y-7">
        {/* Continuous Expedition Spine Line (Shared Geometric Center) */}
        <div
          className={`absolute top-6 bottom-10 ${
            isRtl
              ? 'right-[15px] sm:right-[19px]'
              : 'left-[15px] sm:left-[19px]'
          } w-[2px] bg-slate-300 dark:bg-accent/25 pointer-events-none`}
          aria-hidden="true"
        />

        {itinerary.map((day) => {
          const isOpen = activeDayNumber === day.dayNumber
          const dayNumberPadded = String(day.dayNumber).padStart(2, '0')

          return (
            <div
              key={day.dayNumber}
              id={`itinerary-day-${day.dayNumber}`}
              className="flex items-start gap-3.5 sm:gap-5 group"
            >
              {/* Waypoint Number Capsule on Spine (Strictly Centered on Spine Line) */}
              <div className="shrink-0 w-8 sm:w-10 flex items-center justify-center pt-3 sm:pt-3.5">
                <button
                  type="button"
                  onClick={() => handleToggleDay(day.dayNumber)}
                  aria-label={`Toggle Day ${day.dayNumber}`}
                  className={`relative z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-hornbill font-bold transition-all duration-300 cursor-pointer ${
                    isOpen
                      ? 'bg-primary text-white dark:bg-accent dark:text-[#171412] shadow-md ring-4 ring-primary/20 dark:ring-accent/30 scale-110'
                      : 'bg-white dark:bg-[#1a1614] border-2 border-primary dark:border-accent/40 text-primary dark:text-white shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:text-white dark:group-hover:bg-accent dark:group-hover:text-[#171412] group-hover:ring-4 group-hover:ring-primary/15 dark:group-hover:ring-accent/20'
                  }`}
                >
                  {dayNumberPadded}
                </button>
              </div>

              {/* Day Card (Accordion Container with Tactile Hover Lift & Direct Primary Border in Light Mode) */}
              <div className="flex-1 min-w-0">
                <div
                  className={`relative rounded-2xl border transition-all duration-300 ease-out overflow-hidden hover:-translate-y-0.5 ${
                    isOpen
                      ? 'border-primary dark:border-accent/60 bg-white dark:bg-[#1a1614] shadow-md ring-2 ring-primary/20 dark:ring-accent/25'
                      : 'border-primary dark:border-white/10 bg-white dark:bg-[#151210] shadow-sm hover:shadow-md hover:bg-slate-50/40 dark:hover:bg-[#181513] dark:hover:border-accent/40'
                  }`}
                >

                {/* Clickable Header Trigger (Always Visible) */}
                <button
                  type="button"
                  onClick={() => handleToggleDay(day.dayNumber)}
                  className="relative z-10 w-full text-start p-4 sm:p-5 lg:p-6 flex items-center justify-between gap-4 cursor-pointer select-none group/trigger"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0">
                    {/* Top Meta Line: Day Label & Location Tag */}
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <span className="text-xs sm:text-sm font-bold text-primary dark:text-accent uppercase tracking-wider transition-colors">
                        {dict.get(locale, 'experience.itineraryDay', { day: String(day.dayNumber) })}
                      </span>

                      {day.location && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 dark:bg-accent/10 border border-primary/25 dark:border-accent/25 text-primary dark:text-accent transition-transform hover:scale-105 shadow-2xs">
                          <PinIcon className="w-3 h-3 text-primary dark:text-accent" />
                          <span>{day.location}</span>
                        </span>
                      )}

                      {/* Meals quick hint when collapsed */}
                      {!isOpen && day.includedMeals && day.includedMeals.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          • {day.includedMeals.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Day Title (Only Title is Shown) */}
                    <h3 className="text-base sm:text-lg md:text-xl font-hornbill font-bold text-slate-900 dark:text-white leading-snug group-hover/trigger:text-primary dark:group-hover/trigger:text-white transition-colors duration-200">
                      {day.title}
                    </h3>
                  </div>

                  {/* Right Action Affordance (Visual Invitation to Expand/Collapse with Kinetic Motion) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover/trigger:text-primary dark:group-hover/trigger:text-accent transition-all duration-200 transform group-hover/trigger:translate-x-0.5 rtl:group-hover/trigger:-translate-x-0.5">
                      {isOpen
                        ? dict.get(locale, 'experience.hideDetails')
                        : dict.get(locale, 'experience.viewPlan')}
                    </span>
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isOpen
                          ? 'bg-primary text-white dark:bg-accent dark:text-[#171412] rotate-180 scale-105 shadow-xs'
                          : 'bg-slate-100 border border-slate-300 dark:border-0 dark:bg-white/5 text-slate-600 dark:text-slate-400 group-hover/trigger:bg-primary group-hover/trigger:border-primary group-hover/trigger:text-white dark:group-hover/trigger:bg-accent dark:group-hover/trigger:text-[#171412] group-hover/trigger:scale-110 group-hover/trigger:shadow-sm rotate-0'
                      }`}
                    >
                      <ChevronDownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300" />
                    </div>
                  </div>
                </button>

                {/* Expanded Body Section (Smooth Fluid CSS Grid Transition) */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-5 pt-2 sm:px-6 sm:pb-6 border-t border-slate-200 dark:border-accent/15">
                      <div
                        className={`transition-all duration-500 ease-out delay-75 ${
                          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                        }`}
                      >
                        {/* Full Itinerary Description */}
                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal pt-2">
                          {day.description}
                        </p>

                        {/* Included Meals Ledger */}
                        {day.includedMeals && day.includedMeals.length > 0 && (
                          <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {dict.get(locale, 'experience.includedMeals')}
                            </span>
                            {day.includedMeals.map((meal, mIdx) => (
                              <span
                                key={mIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-300 shadow-2xs hover:scale-105 transition-transform"
                              >
                                <DiningIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{meal}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </section>
  )
}
