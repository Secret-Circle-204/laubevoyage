'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Rating } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

/* Minimalist geometric stroke-based SVG icons */
function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BedIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function ChevronLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function CrossIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function GalleryIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

export interface ExperienceHeroProps {
  title: string
  subtitle: string
  location: string
  formattedDuration: string
  durationNights?: number
  type: 'package' | 'daily_tour'
  rating: number
  reviewsCount: number
  images: string[]
  locale: string
}

export function ExperienceHero({
  title,
  subtitle,
  location,
  formattedDuration,
  durationNights,
  type,
  rating,
  reviewsCount,
  images,
  locale,
}: ExperienceHeroProps) {
  // ── Presentation-Only Gallery State ────────────────────────────────
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const defaultGallery = [
    '/media/about_history_cairo_1767465897120.png',
    '/media/about_hero_egypt_1767465878050.png',
    '/media/about_cultural_treasures_1767465913743.png',
    '/images/hero-bg.jpg',
  ]
  const galleryImages = images && images.length > 0 ? images : defaultGallery
  const heroImage = galleryImages[activeImageIndex] || defaultGallery[0]
  const isPackage = type === 'package'

  const openGallery = (index: number = activeImageIndex) => {
    setActiveImageIndex(index)
    setIsGalleryOpen(true)
  }

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false)
  }, [])

  const nextImage = useCallback(() => {
    if (galleryImages.length === 0) return
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
  }, [galleryImages.length])

  const prevImage = useCallback(() => {
    if (galleryImages.length === 0) return
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isGalleryOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }

    window.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isGalleryOpen, closeGallery, nextImage, prevImage])

  // Mobile Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 50) {
      nextImage()
    } else if (diff < -50) {
      prevImage()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  return (
    <>
      {/* 1. IMMERSIVE HERO (The Primary Gallery Frame) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Open Photographic Gallery"
        onClick={() => openGallery(activeImageIndex)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openGallery(activeImageIndex)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            nextImage()
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            prevImage()
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative min-h-[34rem] sm:min-h-[36rem] lg:min-h-[40rem] w-full rounded-2xl sm:rounded-3xl overflow-hidden mb-10 sm:mb-12 shadow-2xl bg-neutral-950 flex flex-col justify-between p-5 sm:p-12 animate-editorial-reveal stagger-1 group cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-secondary/50"
      >
        {heroImage ? (
          <Image
            key={heroImage}
            src={heroImage}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-95 transition-all duration-500 ease-out group-hover:scale-[1.018]"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent group-hover:via-black/20 transition-colors duration-500" />

        {/* External Gallery Navigation Arrows */}
        {galleryImages.length > 1 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-between px-3 sm:px-6 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
              className="pointer-events-auto w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/25 hover:border-secondary text-white hover:text-secondary flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xl cursor-pointer group/navbtn"
              aria-label="Previous Image"
              title="Previous Image"
            >
              <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/navbtn:-translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
              className="pointer-events-auto w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/25 hover:border-secondary text-white hover:text-secondary flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xl cursor-pointer group/navbtn"
              aria-label="Next Image"
              title="Next Image"
            >
              <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/navbtn:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Top Supra Badges & Gallery Affordance */}
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md border border-white/20 text-secondary-light">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              {type === 'package'
                ? dict.get(locale, 'catalog.packageLabel')
                : dict.get(locale, 'catalog.dailyTourLabel')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {rating > 0 && (
              <div className="bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full flex items-center gap-2">
                <Rating value={rating} reviewsCount={reviewsCount} size="sm" />
              </div>
            )}

            {/* Gallery Affordance Badge */}
            {galleryImages.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openGallery(activeImageIndex)
                }}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-black/60 group-hover:bg-black/85 backdrop-blur-md border border-white/25 group-hover:border-secondary text-white transition-all duration-300 shadow-lg active:scale-95 cursor-pointer"
                aria-label="Open Photographic Gallery"
              >
                <GalleryIcon className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" />
                <span className="font-hornbill text-xs font-bold text-white">
                  {String(activeImageIndex + 1).padStart(2, '0')} / {String(galleryImages.length).padStart(2, '0')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Bottom Editorial Title & Waypoint Trackers */}
        <div className="relative z-10 flex flex-col gap-3 max-w-3xl mt-auto pt-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-hornbill font-normal text-white tracking-tight leading-snug">
            {title}
          </h1>
          {subtitle && subtitle.trim() !== title.trim() && (
            <p className="text-xs sm:text-sm text-neutral-300 font-normal line-clamp-2 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}

          {/* Waypoint Signal Metadata Bar */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap pt-4 border-t border-white/15 text-xs text-white/90">
            <div className="inline-flex items-center gap-2">
              <PinIcon className="w-4 h-4 text-secondary shrink-0" />
              <span className="text-xs font-semibold text-white/95">{location}</span>
            </div>
            <span className="text-white/30">•</span>
            <div className="inline-flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-secondary shrink-0" />
              <span className="text-xs font-semibold text-white/95">{formattedDuration}</span>
            </div>
            {isPackage && typeof durationNights === 'number' && durationNights > 0 && (
              <>
                <span className="text-white/30">•</span>
                <div className="inline-flex items-center gap-2">
                  <BedIcon className="w-4 h-4 text-secondary shrink-0" />
                  <span className="text-xs font-semibold text-white/95">
                    {dict.get(locale, 'experience.nightsAccommodated', { count: String(durationNights) })}
                  </span>
                </div>
              </>
            )}

            {/* Gallery Click Hint */}
            {galleryImages.length > 1 && (
              <div className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-secondary text-xs font-semibold group-hover:underline">
                <span>{dict.get(locale, 'experience.viewGallery')}</span>
                <ChevronRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LUXURY TRAVEL GALLERY VIEWER MODAL ───────────────────────── */}
      {isGalleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery Viewer"
          className="fixed inset-0 z-50 bg-[#231F20]/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 animate-editorial-reveal select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60 max-w-6xl w-full mx-auto">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <span className="text-xs font-bold text-secondary">
                  {dict.get(locale, 'experience.viewGallery')}
                </span>
                <span className="font-hornbill text-sm text-foreground/85 font-light hidden sm:inline-block pl-3 border-l border-border/40 line-clamp-1">
                  {title}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeGallery}
              className="p-2.5 sm:p-3 rounded-full bg-card hover:bg-card-elevated border border-border/80 text-foreground hover:text-secondary transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/40 cursor-pointer"
              aria-label="Close Gallery"
            >
              <CrossIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Large Image Canvas */}
          <div className="relative max-w-5xl w-full h-[55vh] sm:h-[65vh] mx-auto my-auto flex items-center justify-center">
            {galleryImages[activeImageIndex] && (
              <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-border/60 bg-black/60 shadow-2xl">
                <Image
                  src={galleryImages[activeImageIndex]}
                  alt={`${title} photographic plate ${activeImageIndex + 1}`}
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-contain"
                  priority
                />
              </div>
            )}

            {/* Navigation Chevrons */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 hover:border-secondary text-white hover:text-secondary transition-all active:scale-90 z-20 backdrop-blur-md shadow-xl cursor-pointer"
                  aria-label="Previous Image"
                >
                  <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/70 hover:bg-black/90 border border-white/25 hover:border-secondary text-white hover:text-secondary transition-all active:scale-90 z-20 backdrop-blur-md shadow-xl cursor-pointer"
                  aria-label="Next Image"
                >
                  <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Instrumentation */}
          <div className="flex flex-col items-center gap-3 pt-4 border-t border-border/60 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between w-full text-xs">
              {/* Keyboard hint */}
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {dict.get(locale, 'experience.galleryKeyboardHint')}
              </span>

              {/* Counter with Orange Precision */}
              <div className="font-hornbill text-sm sm:text-base mx-auto sm:mx-0">
                <span className="text-accent font-bold text-base sm:text-lg">
                  {String(activeImageIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-muted-foreground mx-1.5">/</span>
                <span className="text-foreground/80 font-medium">
                  {String(galleryImages.length).padStart(2, '0')}
                </span>
              </div>

              {/* Location indicator */}
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {location}
              </span>
            </div>

            {/* Precision Orange Progress Bar */}
            <div className="h-0.5 w-48 sm:w-80 bg-border/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
                style={{ width: `${((activeImageIndex + 1) / galleryImages.length) * 100}%` }}
              />
            </div>

            {/* Thumbnail Navigation Nodes */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`transition-all rounded-full cursor-pointer ${
                      idx === activeImageIndex
                        ? 'w-7 h-2 bg-secondary ring-1 ring-secondary/50'
                        : 'w-2 h-2 bg-border hover:bg-muted-foreground/60'
                    }`}
                    aria-label={`Jump to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
