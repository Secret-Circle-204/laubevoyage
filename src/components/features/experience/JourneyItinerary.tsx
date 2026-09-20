'use client'

import React from 'react'
import type { ItineraryDayDTO } from '@/application/experience/dto-details'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

function DiningIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a3 3 0 016 0v5a3 3 0 01-6 0v-5z" />
    </svg>
  )
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

export interface JourneyItineraryProps {
  itinerary: ItineraryDayDTO[]
  locale: string
}

export function JourneyItinerary({ itinerary, locale }: JourneyItineraryProps) {
  if (!itinerary || itinerary.length === 0) return null

  return (
    <section className="animate-editorial-reveal stagger-3">
      <div className="flex flex-col mb-8 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <h2 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground">
            {dict.get(locale, 'experience.itineraryTitle')}
          </h2>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-secondary/25 space-y-8">
        {itinerary.map((day) => (
          <div key={day.dayNumber} className="relative group">
            {/* Waypoint Number Node (Cyan ring, card fill, and hornbill typography) */}
            <span className="absolute -left-[32px] sm:-left-[41px] top-2 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card border-2 border-secondary text-xs font-hornbill font-bold text-secondary shadow-md ring-4 ring-card transition-transform group-hover:scale-110 duration-200">
              {String(day.dayNumber).padStart(2, '0')}
            </span>

            {/* Content Card with Elevation */}
            <div className="p-6 sm:p-8 rounded-2xl border border-border/80 bg-card hover:border-secondary/50 transition-all duration-300 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                <span className="text-xs uppercase text-secondary font-bold">
                  {dict.get(locale, 'experience.itineraryDay').replace('{day}', String(day.dayNumber))}
                </span>
                {day.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 border border-secondary/25 text-secondary">
                    <PinIcon className="w-3.5 h-3.5" />
                    <span>{day.location}</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-hornbill font-light text-foreground mb-3">
                {day.title}
              </h3>
              <p className="text-sm sm:text-base text-foreground/85 leading-relaxed font-normal">
                {day.description}
              </p>

              {day.includedMeals && day.includedMeals.length > 0 && (
                <div className="mt-5 pt-3.5 border-t border-border/50 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    {locale === 'ar' ? 'الوجبات المشمولة:' : 'Included Meals:'}
                  </span>
                  {day.includedMeals.map((meal, mIdx) => (
                    <span
                      key={mIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/10 border border-secondary/25 text-secondary"
                    >
                      <DiningIcon className="w-3.5 h-3.5" />
                      <span>{meal}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
