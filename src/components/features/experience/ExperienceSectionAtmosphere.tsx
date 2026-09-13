'use client'

import React from 'react'

export interface ExperienceSectionAtmosphereProps {
  images: string[]
  className?: string
  blur?: string
  activeOpacityClassName?: string
  overlayClassName?: string
}

/**
 * Shared Atmospheric Presentation Layer for Experience Sections.
 * Provides the canonical scenic cross-fade background (8-second auto-rotation,
 * pausing when document is hidden), configurable blur, 1.1 scale, and vignette gradient.
 * Operates purely automatically without mouse-controlled switching.
 * Single source of truth shared between Homepage and Catalog.
 */
export function ExperienceSectionAtmosphere({
  images,
  className = '',
  blur = 'blur(18px)',
  activeOpacityClassName = 'opacity-55 sm:opacity-65',
  overlayClassName,
}: ExperienceSectionAtmosphereProps) {
  // Deduplicate and filter authentic image URLs
  const bgImages = React.useMemo(() => {
    const urls = images.filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0,
    )
    return Array.from(new Set(urls))
  }, [images])

  const [currentIndex, setCurrentIndex] = React.useState(0)

  // Gentle scenic cross-fade over time (8 seconds)
  // Pauses automatically when tab is not active to consume zero RAM/CPU
  React.useEffect(() => {
    if (bgImages.length <= 1) return

    let timer: NodeJS.Timeout

    const startTimer = () => {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % bgImages.length)
      }, 8000)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timer)
      } else {
        startTimer()
      }
    }

    startTimer()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [bgImages.length])

  if (bgImages.length === 0) return null

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {bgImages.map((imgUrl, idx) => (
        <div
          key={imgUrl}
          className={`absolute -inset-10 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? activeOpacityClassName : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${imgUrl})`,
            filter: blur,
            transform: 'scale(1.1)',
            willChange: 'opacity',
          }}
        />
      ))}

      {/* Canonical Vignette overlay ensuring maximum legibility while letting destination scenery shine through */}
      <div
        className={
          overlayClassName ??
          'absolute inset-0 bg-[#0c0a0b]/35 bg-gradient-to-b from-[#0c0a0b]/75 via-[#0c0a0b]/30 to-[#0c0a0b]/85'
        }
      />
    </div>
  )
}
