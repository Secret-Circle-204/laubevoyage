import React from 'react'
import { DawnCompassLoader } from './DawnCompassLoader'

export interface FullScreenLoadingScreenProps {
  /**
   * Optional custom children to display inside the centered loading capsule.
   * Defaults to `<DawnCompassLoader size="lg" />`.
   */
  children?: React.ReactNode

  /**
   * Optional custom classes appended to the root viewport wrapper.
   */
  className?: string

  /**
   * Optional accessible label passed by consumer (e.g. localized dictionary string).
   * When omitted, the screen is treated as decorative (`aria-hidden="true"`).
   */
  'aria-label'?: string

  /**
   * Optional accessibility role. Defaults to 'status' when aria-label is present.
   */
  role?: string

  /**
   * Loader size variant when using default DawnCompassLoader.
   * @default 'lg'
   */
  loaderSize?: 'sm' | 'md' | 'lg'
}

/**
 * FullScreenLoadingScreen
 * Dedicated viewport-level loading surface for L'Aube Voyage.
 *
 * Architectural & Layout Invariants:
 * - Completely decouples viewport coverage, stacking context, and background
 *   from the purely visual `DawnCompassLoader` SVG component.
 * - Spans 100vw and 100dvh (with 100vh fallback) with `fixed inset-0 z-[60]`.
 * - Obscures Header (z-40), Footer, and underlying page flow entirely.
 * - Centers the brand signature departure animation horizontally and vertically.
 * - Prevents pointer interaction and unwanted scrolling on underlying page content.
 * - Features the official L'Aube Voyage brand identity atmospheric aura in dark mode:
 *   Deep Royal Indigo (#2E3191), Sunrise Dawn Orange (#F48120), Sky Cyan (#00ADEE),
 *   and Signature Charcoal Black (#231F20).
 * - Pure Server Component (RSC) compatible — zero client hooks or browser globals.
 */
export function FullScreenLoadingScreen({
  children,
  className = '',
  'aria-label': ariaLabel,
  role,
  loaderSize = 'lg',
}: FullScreenLoadingScreenProps) {
  const resolvedRole = role ?? (ariaLabel ? 'status' : undefined)
  const isDecorative = !ariaLabel

  return (
    <div
      data-testid="full-screen-loading-surface"
      className={`fixed inset-0 z-[60] w-screen h-screen min-h-[100dvh] flex flex-col items-center justify-center pointer-events-auto select-none overflow-hidden touch-none bg-[#f8f7f5] dark:bg-[#141214] text-foreground ${className}`}
      role={resolvedRole}
      aria-label={ariaLabel}
      aria-hidden={isDecorative ? true : undefined}
    >
      {/* ===================================================================
          L'AUBE VOYAGE — Official Brand Atmosphere Mesh (Dark Mode)
          Color 1: Deep Royal Indigo (#2E3191 / #1E2166) - Night sky aura
          Color 2: Dawn Horizon Orange (#F48120) - Sunrise break on horizon
          Color 3: Bright Sky Cyan (#00ADEE) - Dynamic wind accent
          Color 4: Signature Charcoal Black (#231F20) - Luxury dark canvas
          =================================================================== */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-700 motion-reduce:transition-none"
      >
        {/* 1. Deep Royal Indigo Sky (#2E3191 / #1E2166) */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[460px] bg-[radial-gradient(ellipse_at_center,rgba(46,49,145,0.52)_0%,rgba(30,33,102,0.3)_48%,transparent_75%)] blur-3xl" />

        {/* 2. L'Aube Sunrise Orange Glow (#F48120) */}
        <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[280px] bg-[radial-gradient(ellipse_at_center,rgba(244,129,32,0.24)_0%,rgba(244,129,32,0.06)_45%,transparent_70%)] blur-2xl" />

        {/* 3. Sky Cyan Air Flow (#00ADEE) */}
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[160px] bg-[radial-gradient(ellipse_at_center,rgba(0,173,238,0.14)_0%,transparent_60%)] blur-2xl" />

        {/* 4. Horizon Vignette & Brand Charcoal (#231F20) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_80%_at_50%_45%,transparent_50%,rgba(24,21,24,0.75)_80%,#0e0d10_100%)]" />
      </div>

      {/* Centered Brand Composition */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-8">
        {children ?? <DawnCompassLoader size={loaderSize} />}
      </div>
    </div>
  )
}
