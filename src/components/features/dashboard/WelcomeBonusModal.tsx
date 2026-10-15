import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import type { WelcomeBonusModalDTO } from '@/application/dashboard/dto'
import { dismissWelcomeModalAction } from '@/application/actions/customer-actions'

export interface WelcomeBonusModalProps {
  welcomeModal: WelcomeBonusModalDTO
  customerId: number
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

  useEffect(() => {
    // If URL has ?welcome=1 or ?welcome=true, force open
    const forceOpen = searchParams?.get('welcome') === '1' || searchParams?.get('welcome') === 'true'
    const storageKey = `laube_welcome_dismissed_${customerId}`
    const isDismissed = typeof window !== 'undefined' ? localStorage.getItem(storageKey) === '1' : false

    if (forceOpen || (welcomeModal.shouldShow && !isDismissed)) {
      // Gentle glide-in entrance after dashboard renders
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [welcomeModal.shouldShow, customerId, searchParams])

  const handleDismiss = (redirectHref?: string) => {
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`laube_welcome_dismissed_${customerId}`, '1')
      } catch {
        // Safe fallback in restricted environments
      }
    }

    startTransition(async () => {
      try {
        await dismissWelcomeModalAction()
      } catch (err) {
        console.warn('[WelcomeBonusModal] Non-blocking dismissal error:', err)
      }
    })

    if (redirectHref) {
      router.push(redirectHref)
    }
  }

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
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
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

          {/* Modal Container Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            className="relative w-full max-w-lg sm:max-w-xl mx-auto rounded-3xl border border-white/20 bg-gradient-to-b from-[#111A24] via-[#0D151F] to-[#0A1017] p-6 sm:p-8 text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(244,129,32,0.18)] overflow-hidden z-10"
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

            {/* Close Button */}
            <button
              type="button"
              onClick={() => handleDismiss()}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00ADEE]/50 group"
              aria-label="Close welcome message"
            >
              <CloseIcon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            </button>

            {/* Header Badge & Emblem */}
            <div className="flex flex-col items-center text-center space-y-4 pt-1">
              {/* Luxury Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#F48120]/20 via-[#f7943d]/15 to-[#00ADEE]/20 border border-[#F48120]/35 text-xs font-bold uppercase tracking-widest text-[#F48120] shadow-[0_0_20px_rgba(244,129,32,0.2)]">
                <SparkleIcon className="w-3.5 h-3.5 text-[#fbbf24] animate-pulse" />
                <span>{welcomeModal.badgeText}</span>
              </div>

              {/* Points Celebration Pill */}
              <div className="w-full flex items-center justify-center gap-3.5 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F48120]/15 via-[#fbbf24]/10 to-[#00ADEE]/15 border border-[#F48120]/30 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F48120] to-[#fbbf24] flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,129,32,0.5)] flex-shrink-0">
                  <GemGiftIcon className="w-5 h-5" />
                </div>
                <div className="text-left rtl:text-right">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-hornbill font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#F48120] via-[#f7a048] to-[#fbbf24] drop-shadow-[0_2px_10px_rgba(244,129,32,0.4)]">
                      +{welcomeModal.formattedBonusPoints}
                    </span>
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                      {welcomeModal.pointsCreditedText}
                    </span>
                  </div>
                  {welcomeModal.pointsMonetaryValue && (
                    <span className="text-[11px] font-semibold text-[#00ADEE]">
                      ≈ {welcomeModal.pointsMonetaryValue} {welcomeModal.travelCreditText || 'Travel Credit'}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Personalized Subtitle */}
              <div className="space-y-1">
                <h2
                  id="welcome-modal-title"
                  className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide"
                >
                  {welcomeModal.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#00ADEE] font-medium tracking-wide">
                  {welcomeModal.subtitle}
                </p>
              </div>

              {/* Primary Lead Welcome Message */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md font-sans">
                {welcomeModal.leadMessage}
              </p>
            </div>

            {/* "How It Works" Section */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#00ADEE] shadow-[0_0_8px_rgba(0,174,239,0.7)]" />
                <span>{welcomeModal.howItWorksTitle}</span>
              </div>

              {/* 2-Card Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Card 1: Earn More */}
                <div className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 transition-all duration-200 hover:border-[#00ADEE]/40 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#00ADEE]/10 border border-[#00ADEE]/30 text-[#00ADEE] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <CompassIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {welcomeModal.earnMoreTitle}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {welcomeModal.earnMoreDesc}
                  </p>
                </div>

                {/* Card 2: Your Choice */}
                <div className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 transition-all duration-200 hover:border-[#F48120]/40 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F48120]/10 border border-[#F48120]/30 text-[#F48120] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <SparkleIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {welcomeModal.yourChoiceTitle}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {welcomeModal.yourChoiceDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleDismiss('/experiences')}
                className="relative flex-1 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] hover:shadow-[0_15px_40px_rgba(244,129,32,0.55)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 group before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700"
              >
                <span>{welcomeModal.exploreBtnText}</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1 font-bold">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleDismiss()}
                className="py-3.5 px-5 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 transition-all duration-200 cursor-pointer text-center"
              >
                {welcomeModal.dismissBtnText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
