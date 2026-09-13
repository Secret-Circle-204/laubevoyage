'use client'

import React from 'react'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export interface JourneySummaryProps {
  formattedDuration: string
  location: string
  isPackage: boolean
  descriptionHtml?: string
  locale: string
}

export function JourneySummary({
  formattedDuration,
  location,
  isPackage,
  descriptionHtml,
  locale,
}: JourneySummaryProps) {
  return (
    <section className="animate-editorial-reveal stagger-2">
      <div className="p-7 sm:p-9 rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col gap-6">
        {/* Header with Cyan Waypoint Signal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-xs uppercase font-bold text-secondary">
              The Journey Dossier
            </span>
          </div>
          <span className="text-xs uppercase text-muted-foreground font-medium">
            Curated Monograph
          </span>
        </div>

        {/* Asymmetric Monograph Grid with Warm Elevated Plate */}
        <div className="p-6 sm:p-7 rounded-2xl bg-card-elevated/60 border border-border/70 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <span className="text-[11px] uppercase text-muted-foreground font-bold block mb-1">
              Duration
            </span>
            <span className="font-hornbill text-xl sm:text-2xl text-foreground font-light block">
              {formattedDuration}
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase text-muted-foreground font-bold block mb-1">
              Sanctuary
            </span>
            <span className="font-hornbill text-xl sm:text-2xl text-foreground font-light block">
              {location.split(',')[0]}
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase text-muted-foreground font-bold block mb-1">
              Tier
            </span>
            <span className="font-hornbill text-xl sm:text-2xl text-foreground font-light block">
              Signature
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase text-muted-foreground font-bold block mb-1">
              Model
            </span>
            <span className="font-hornbill text-xl sm:text-2xl text-foreground font-light block">
              {isPackage ? 'Grand Journey' : 'Day Sanctuary'}
            </span>
          </div>
        </div>

        {/* Editorial Description Excerpt */}
        {descriptionHtml && (
          <div className="pt-4 border-t border-border/50">
            <h3 className="text-xl sm:text-2xl font-hornbill font-light text-foreground mb-4">
              {dict.get(locale, 'experience.journeyOverview')}
            </h3>
            <div
              className="prose dark:prose-invert max-w-none text-sm sm:text-base text-foreground/80 leading-relaxed font-normal"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
