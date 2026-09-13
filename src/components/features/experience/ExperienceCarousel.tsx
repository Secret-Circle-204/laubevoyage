'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ExperienceCard } from './ExperienceCard'
import type { HomeFeaturedExperienceDTO } from '@/application/pages/home/dto'
import type { ExperienceCardLabels } from './ExperienceCard/ExperienceCard.types'

interface ExperienceCarouselProps {
  experiences: HomeFeaturedExperienceDTO[]
  withAmbientGlow?: boolean
  labels?: ExperienceCardLabels
  className?: string
  onHoverExperience?: (imageUrl: string) => void
  onActiveIndexChange?: (index: number) => void
}

export function ExperienceCarousel({
  experiences,
  withAmbientGlow = true,
  labels,
  className = '',
  onHoverExperience,
  onActiveIndexChange,
}: ExperienceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || experiences.length === 0) return
    const scrollLeft = Math.abs(el.scrollLeft)
    const itemWidth = el.scrollWidth / experiences.length
    const newIndex = Math.min(
      Math.max(Math.round(scrollLeft / itemWidth), 0),
      experiences.length - 1,
    )
    setActiveIndex(newIndex)
    if (onActiveIndexChange) {
      onActiveIndexChange(newIndex)
    }
    if (onHoverExperience && experiences[newIndex]?.imageUrl) {
      onHoverExperience(experiences[newIndex].imageUrl)
    }
  }, [experiences, onActiveIndexChange, onHoverExperience])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (!experiences || experiences.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      {/* Mobile Scroll Snap Container & Desktop 3-Column Grid */}
      <div
        ref={scrollRef}
        className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-6 md:pb-0"
        tabIndex={0}
        aria-label="Featured Experiences List"
      >
        {experiences.map((item, index) => (
          <div
            key={item.id}
            className="shrink-0 w-[88vw] max-w-[400px] sm:w-[420px] md:w-auto snap-center"
          >
            <ExperienceCard
              experience={item}
              variant="featured"
              withAmbientGlow={withAmbientGlow}
              priority={index < 2}
              labels={labels}
              onHover={onHoverExperience}
            />
          </div>
        ))}
      </div>

      {/* Mobile Dynamic Indicator (Active Slide / Total) */}
      {experiences.length > 1 && (
        <div className="flex md:hidden items-center justify-center gap-2 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border/80 text-[11px] font-medium text-muted-foreground shadow-xs">
            <span className="text-foreground font-bold">{activeIndex + 1}</span>
            <span>/</span>
            <span>{experiences.length}</span>
          </div>

          <div className="flex items-center gap-1">
            {experiences.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-6 bg-accent'
                    : 'w-1.5 bg-border/80'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
