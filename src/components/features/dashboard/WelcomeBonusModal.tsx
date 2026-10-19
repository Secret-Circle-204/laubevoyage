import React, { useEffect, useState, useRef, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import type { WelcomeBonusModalDTO } from '@/application/dashboard/dto'
import { dismissWelcomeModalAction } from '@/application/actions/customer-actions'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export interface WelcomeBonusModalProps {
  welcomeModal: WelcomeBonusModalDTO
  customerId: number
}

/**
 * Safely strips ?welcome=1 (or welcome=true) from window.location without a full page reload
 * or Next.js router refetch, while preserving all other query parameters, pathname, and hash.
 */
function stripWelcomeParam() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('welcome')) {
      url.searchParams.delete('welcome')
      const cleanPath = url.pathname + (url.search ? url.search : '') + url.hash
      window.history.replaceState(window.history.state, '', cleanPath)
    }
  } catch {
    // Safe fallback in non-standard test or sandboxed environments
  }
}

/* Minimalist geometric luxury SVG icons */
function SparkleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
    </svg>
  )
}

function CompassIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity={0.25} />
    </svg>
  )
}

function GemGiftIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M21 11.25H3M21 11.25a2.25 2.25 0 000-4.5H3a2.25 2.25 0 000 4.5M12 3v18M7.5 6.75a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zm4.5 0a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" />
    </svg>
  )
}

function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function WelcomeBonusModal({ welcomeModal, customerId }: WelcomeBonusModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const { locale } = useLocale()
  const closeAriaLabel = dict.get(locale, 'dashboard.overview.welcomeModalCloseAria') || 'Close welcome message'

  // Ref guards to prioritize local dismissal and cleanly cancel pending open timers
  const hasDismissedRef = useRef(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback((redirectHref?: string) => {
    // 1. Immediately cancel any pending open timer so it cannot fire after dismissal
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }

    // 2. Mark dismissed in local memory and close modal
    hasDismissedRef.current = true
    setIsOpen(false)

    // 3. Strip ?welcome parameter cleanly without page reload
    stripWelcomeParam()

    // 4. Persist dismissal locally in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`laube_welcome_dismissed_${customerId}`, '1')
      } catch {
        // Safe fallback in restricted environments
      }
    }

    // 5. Asynchronously notify the server without blocking UI
    startTransition(async () => {
      try {
        await dismissWelcomeModalAction()
      } catch (err) {
        console.warn('[WelcomeBonusModal] Non-blocking dismissal error:', err)
      }
    })

    // 6. Handle optional redirect
    if (redirectHref) {
      router.push(redirectHref)
    }
  }, [customerId, router])

  useEffect(() => {
    const storageKey = `laube_welcome_dismissed_${customerId}`
    const isDismissedInStorage = typeof window !== 'undefined' ? localStorage.getItem(storageKey) === '1' : false

    // Requirement 1 & 2: Local dismissal takes absolute priority.
    // If the user dismissed the modal during this component lifecycle or in localStorage,
    // do NOT re-open under ANY condition (even if ?welcome=1 remains or props change via revalidatePath).
    if (hasDismissedRef.current || isDismissedInStorage) {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current)
        openTimerRef.current = null
      }
      stripWelcomeParam()
      return
    }

    // Evaluate open triggers: explicit URL parameter or server qualification
    const forceOpen = searchParams?.get('welcome') === '1' || searchParams?.get('welcome') === 'true'
    const shouldOpen = forceOpen || welcomeModal.shouldShow

    if (shouldOpen) {
      // Clear any previous timer to ensure single timer in Strict Mode or fast re-renders
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current)
        openTimerRef.current = null
      }

      // Gentle glide-in entrance after dashboard renders
      openTimerRef.current = setTimeout(() => {
        // Double-check dismissal ref before setting state
        if (!hasDismissedRef.current) {
          setIsOpen(true)
          // Strip ?welcome query param after consumption
          stripWelcomeParam()
        }
        openTimerRef.current = null
      }, 350)
    }

    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current)
        openTimerRef.current = null
      }
    }
  }, [welcomeModal.shouldShow, customerId, searchParams])

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleDismiss])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
        >
          {/* Glassmorphic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleDismiss()}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            aria-hidden="true"
          />

          {/* Centering Wrapper with min-h-full to prevent vertical clipping on mobile */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
            {/* Modal Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
              className="relative w-full max-w-lg sm:max-w-xl my-auto rounded-3xl border border-white/20 bg-gradient-to-b from-[#111A24] via-[#0D151F] to-[#0A1017] p-5 sm:p-8 text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(244,129,32,0.18)] overflow-hidden z-10 max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col"
            >
              {/* Ambient Radial Background Glows */}
              <div
                className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#00ADEE]/15 blur-3xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-[#F48120]/15 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              {/* Top Border Shimmer Line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F48120]/70 to-[#00ADEE]/70"
                aria-hidden="true"
              />

              {/* Close Button - Responsive RTL placement & 44px min touch target on ALL screen sizes */}
              <button
                type="button"
                onClick={() => handleDismiss()}
                className="absolute top-3 right-3 rtl:right-auto rtl:left-3 sm:top-5 sm:right-5 sm:rtl:right-auto sm:rtl:left-5 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00ADEE]/50 group z-20"
                aria-label={closeAriaLabel}
              >
                <CloseIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </button>

              {/* Scrollable Content Area for Small Screens */}
              <div className="overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 pr-1 sm:pr-0 scrollbar-thin">
                {/* Header Badge & Emblem - generous horizontal padding guarantees zero collision with 44px close button */}
                <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 pt-1 sm:pt-0 px-10 sm:px-12">
                  {/* Luxury Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#F48120]/20 via-[#f7943d]/15 to-[#00ADEE]/20 border border-[#F48120]/35 text-xs font-bold uppercase tracking-widest text-[#F48120] shadow-[0_0_20px_rgba(244,129,32,0.2)]">
                    <SparkleIcon className="w-3.5 h-3.5 text-[#fbbf24] animate-pulse" />
                    <span>{welcomeModal.badgeText}</span>
                  </div>

                  {/* Points Celebration Pill */}
                  <div className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-[#F48120]/15 via-[#fbbf24]/10 to-[#00ADEE]/15 border border-[#F48120]/30 shadow-inner">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#F48120] to-[#fbbf24] flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,129,32,0.5)] shrink-0">
                      <GemGiftIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left rtl:text-right min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-hornbill font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#F48120] via-[#f7a048] to-[#fbbf24] drop-shadow-[0_2px_10px_rgba(244,129,32,0.4)]">
                          +{welcomeModal.formattedBonusPoints}
                        </span>
                        <span className="text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-wider text-slate-200">
                          {welcomeModal.pointsCreditedText}
                        </span>
                      </div>
                      {welcomeModal.pointsMonetaryValue && (
                        <span className="block text-[11px] sm:text-xs font-semibold text-[#00ADEE] mt-0.5 truncate">
                          ≈ {welcomeModal.pointsMonetaryValue} {welcomeModal.travelCreditText || 'Travel Credit'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Personalized Subtitle */}
                  <div className="space-y-1">
                    <h2
                      id="welcome-modal-title"
                      className="text-xl sm:text-2xl md:text-3xl font-hornbill font-light text-white tracking-wide"
                    >
                      {welcomeModal.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#00ADEE] font-medium tracking-wide">
                      {welcomeModal.subtitle}
                    </p>
                  </div>

                  {/* Primary Lead Welcome Message */}
                  <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-md mx-auto font-sans">
                    {welcomeModal.leadMessage}
                  </p>
                </div>

                {/* "How It Works" Section */}
                <div className="pt-3 sm:pt-4 border-t border-white/10 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#00ADEE] shadow-[0_0_8px_rgba(0,174,239,0.7)]" />
                    <span>{welcomeModal.howItWorksTitle}</span>
                  </div>

                  {/* 2-Card Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left rtl:text-right">
                    {/* Card 1: Earn More */}
                    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 sm:p-4 transition-all duration-200 hover:border-[#00ADEE]/40 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#00ADEE]/10 border border-[#00ADEE]/30 text-[#00ADEE] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <CompassIcon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          {welcomeModal.earnMoreTitle}
                        </h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        {welcomeModal.earnMoreDesc}
                      </p>
                    </div>

                    {/* Card 2: Your Choice */}
                    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 sm:p-4 transition-all duration-200 hover:border-[#F48120]/40 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F48120]/10 border border-[#F48120]/30 text-[#F48120] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <SparkleIcon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          {welcomeModal.yourChoiceTitle}
                        </h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        {welcomeModal.yourChoiceDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Pinned at bottom with safe spacing */}
              <div className="mt-4 pt-3 sm:pt-4 border-t border-white/10 shrink-0 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleDismiss(welcomeModal.exploreBtnHref || '/experiences')}
                  className="relative flex-1 min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] hover:shadow-[0_15px_40px_rgba(244,129,32,0.55)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700"
                >
                  <span>{welcomeModal.exploreBtnText}</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 font-bold">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDismiss()}
                  className="min-h-[44px] sm:min-h-[48px] py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 transition-all duration-200 cursor-pointer text-center active:scale-[0.98]"
                >
                  {welcomeModal.dismissBtnText}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
