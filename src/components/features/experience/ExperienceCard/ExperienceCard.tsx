'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CurrencyDisplay } from '@/components/ui'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { ExperienceCardProps } from './ExperienceCard.types'

const dict = new JsonTranslationDictionary()

export function ExperienceCard({
  experience,
  variant = 'catalog',
  withAmbientGlow = true,
  priority = false,
  className = '',
  labels,
  onHover,
  onLeave,
}: ExperienceCardProps) {
  const { locale } = useLocale()

  // Centralized label resolution
  const packageLabel =
    labels?.packageLabel ?? dict.get(locale, 'catalog.packageLabel')
  const dailyTourLabel =
    labels?.dailyTourLabel ?? dict.get(locale, 'catalog.dailyTourLabel')
  const fromPerAdult =
    labels?.fromPerAdult ?? dict.get(locale, 'experience.fromPerAdult')
  const dayUnit =
    experience.durationDays === 1
      ? (labels?.daySingular ?? dict.get(locale, 'experience.daySingular'))
      : (labels?.dayPlural ?? dict.get(locale, 'experience.dayPlural'))
  const guestUnit =
    labels?.guestSingular ?? dict.get(locale, 'experience.guestSingular')

  const isPackage = experience.type === 'package'
  const typeText = isPackage ? packageLabel : dailyTourLabel

  // Real Experience Gallery Photos (strictly trip photos, hidden if empty)
  const thumbnails = (experience.thumbnails || []).filter(Boolean)
  const displayThumbnails = thumbnails.slice(0, 3)
  const remainingThumbnailsCount = Math.max(0, thumbnails.length - 3)

  // Real Feature Inclusions directly from database (zero hardcoded fallback)
  const features = (experience.features || []).filter(Boolean)

  const handleMouseEnter = () => {
    if (onHover && experience.imageUrl) {
      onHover(experience.imageUrl)
    }
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
    >
      {/* Visible Atmospheric Color Diffusion Below the Card */}
      {withAmbientGlow && experience.imageUrl && (
        <div
          className="absolute -bottom-6 sm:-bottom-8 inset-x-6 sm:inset-x-8 h-20 sm:h-24 rounded-full opacity-65 group-hover:opacity-90 transition-opacity duration-500 blur-2xl sm:blur-3xl -z-10 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="w-full h-full bg-cover bg-bottom scale-125"
            style={{ backgroundImage: `url(${experience.imageUrl})` }}
          />
        </div>
      )}

      <article
        className="relative flex flex-col h-full bg-[#161415] text-white border border-white/10 rounded-[28px] overflow-hidden transition-all duration-500 ease-out hover:border-accent/40 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),0_0_35px_rgba(245,130,32,0.15)] hover:-translate-y-2 focus-within:ring-2 focus-within:ring-accent"
      >
        <Link
          href={`/experiences/${experience.slug || experience.id}`}
          className="flex flex-col h-full grow focus:outline-none"
        >
          {/* Immersive Editorial Image Header (Taller, expansive 4:3 luxury ratio) */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-950">
            {experience.imageUrl ? (
              <Image
                src={experience.imageUrl}
                alt={experience.title}
                fill
                priority={priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-neutral-500 gap-2">
                <svg
                  className="w-10 h-10 text-accent/40 stroke-[1.2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v18M3 12h18" strokeDasharray="2 2" />
                  <polygon points="12,7 14,12 12,17 10,12" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold text-neutral-400">
                  L&apos;Aube Voyage
                </span>
              </div>
            )}

            {/* Top Floating Badge (Crown Category Pill) */}
            <div className="absolute top-3.5 left-3.5 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-md">
                <svg
                  className="w-3 h-3 text-accent shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
                </svg>
                <span>{typeText}</span>
              </div>
            </div>

            {/* Deep Dark Gradient Blending Image into Card Body */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#161415] via-[#161415]/40 to-transparent" />

            {/* Bottom Floating Route Trajectory & Duration Bar on Image */}
            <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between text-xs font-medium text-neutral-200">
              {experience.routeCities && experience.routeCities.length > 1 ? (
                <div className="flex items-center gap-1.5 truncate max-w-[72%]">
                  <svg
                    className="w-3.5 h-3.5 text-accent shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <div className="truncate text-neutral-200 font-normal flex items-center gap-1.5">
                    {experience.routeCities.map((city, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <span className="text-accent/90 text-xs font-bold inline-block rtl:rotate-180 select-none">
                            &rarr;
                          </span>
                        )}
                        <span className="truncate">{city}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : experience.location ? (
                <div className="flex items-center gap-1.5 truncate max-w-[72%]">
                  <svg
                    className="w-3.5 h-3.5 text-accent shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <span className="truncate text-neutral-200 font-normal">
                    {experience.location}
                  </span>
                </div>
              ) : (
                <span />
              )}

              {experience.durationDays > 0 && (
                <span className="shrink-0 text-neutral-200 font-medium">
                  {experience.durationDays} {dayUnit}
                </span>
              )}
            </div>
          </div>

          {/* Card Editorial Body with Subtle Image Tone Infusion */}
          <div className="relative flex flex-col grow p-6 sm:p-7 justify-between gap-5 overflow-hidden">
            {/* Subtle Image Color Tint inside Card Body */}
            {experience.imageUrl && (
              <div
                className="absolute inset-0 bg-cover bg-bottom opacity-15 blur-3xl scale-125 pointer-events-none -z-0"
                style={{ backgroundImage: `url(${experience.imageUrl})` }}
                aria-hidden="true"
              />
            )}
            <div className="absolute inset-0 bg-[#161415]/90 pointer-events-none -z-0" />

            <div className="relative z-10 space-y-3.5">
              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-serif font-light text-white group-hover:text-accent transition-colors duration-300 line-clamp-2 leading-snug tracking-tight">
                {experience.title}
              </h3>

              {/* Subtitle */}
              {experience.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed line-clamp-1">
                  {experience.subtitle}
                </p>
              )}

              {/* Circular Destination / Gallery Thumbnails Strip */}
              {displayThumbnails.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {displayThumbnails.map((thumbUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-8 h-8 rounded-full border-2 border-[#161415] ring-1 ring-white/20 overflow-hidden shadow-sm shrink-0"
                    >
                      <Image
                        src={thumbUrl}
                        alt={dict.get(locale, 'experience.destinationPreview')}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                  {remainingThumbnailsCount > 0 && (
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-[#161415] ring-1 ring-white/10 flex items-center justify-center text-[10px] font-bold text-neutral-300 shadow-sm shrink-0">
                      +{remainingThumbnailsCount}
                    </div>
                  )}
                </div>
              )}

              {/* Feature Highlights Row (Responsive & semantic icons based on real feature text) */}
              {features.length > 0 && (
                <div className="flex flex-wrap items-start gap-x-3.5 sm:gap-x-4 gap-y-2 pt-1 text-xs text-neutral-300 font-light w-full">
                  {features.slice(0, 3).map((feat, idx) => {
                    const isAccommodation = /hotel|accommodation|stay|night|resort|فندق|إقامة|ليال/i.test(feat)
                    const isTransfer = /transfer|transport|chauffeur|flight|airport|طيران|نقل|توصيل|مطار/i.test(feat)
                    const isGuide = /guide|egyptologist|expert|مرشد|خبير/i.test(feat)

                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 max-w-full min-w-0"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-accent/90 shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          {isAccommodation ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21"
                            />
                          ) : isTransfer ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.215-9.102m-13.5 10.226c.395-.87.973-1.638 1.688-2.25m10.122 2.25c-.395-.87-.973-1.638-1.688-2.25"
                            />
                          ) : isGuide ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          )}
                        </svg>
                        <span className="text-[11px] font-medium text-neutral-300 leading-snug break-words whitespace-normal">
                          {feat}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom Row: Price & Circular Gold CTA Button */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-end justify-between gap-4 mt-auto">
              {/* Price Block */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-neutral-400">
                  {fromPerAdult}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <CurrencyDisplay
                    price={experience.price}
                    size="lg"
                    className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight"
                  />
                  {guestUnit && (
                    <span className="text-xs text-neutral-400 font-light">
                      / {guestUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Circular Gold/Orange Action Button with Arrow */}
              <div className="w-12 h-12 rounded-full bg-[#E5853B] text-white flex items-center justify-center group-hover:scale-110 shadow-lg shadow-[#E5853B]/25 transition-transform duration-300 shrink-0">
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </article>
    </div>
  )
}
