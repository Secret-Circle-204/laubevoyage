'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast, useLocale } from '@/providers'
import { verifyEmailAction, resendVerificationAction } from '@/application/actions/customer-actions'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

interface VerifyEmailClientProps {
  token?: string
  email?: string
  welcomeBonus?: number
}

type StatusState = 'loading' | 'success' | 'already_verified' | 'failed'

const dict = new JsonTranslationDictionary()

// SVG Icons
function MailIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function SpinnerIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function InfoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function XCircleIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SparkleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
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

export default function VerifyEmailClient({ token, email, welcomeBonus }: VerifyEmailClientProps) {
  const { addToast } = useToast()
  const { locale } = useLocale()

  const t = (key: string, params?: Record<string, string | number>) =>
    dict.get(locale, `auth.verifyEmail.${key}`, params)

  const [status, setStatus] = useState<StatusState>(token ? 'loading' : 'success')
  const [errorMessage, setErrorMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    if (!email || isResending || resendCooldown > 0) return
    setIsResending(true)
    try {
      const res = await resendVerificationAction(email)
      if (res.success) {
        addToast({
          type: 'success',
          title: t('toastResendSentTitle'),
          description: res.message || t('toastResendSentDesc'),
        })
        setResendCooldown(60)
      } else {
        addToast({
          type: 'error',
          title: t('toastFailedTitle'),
          description: res.error || t('toastFailedDesc'),
        })
      }
    } catch {
      addToast({
        type: 'error',
        title: t('toastErrorTitle'),
        description: t('toastFailedDesc'),
      })
    } finally {
      setIsResending(false)
    }
  }

  useEffect(() => {
    if (!token) return

    let isMounted = true

    const verify = async () => {
      try {
        const res = await verifyEmailAction(token, email)
        if (!isMounted) return

        if (res.success) {
          if ('alreadyVerified' in res && res.alreadyVerified) {
            setStatus('already_verified')
            addToast({
              type: 'info',
              title: t('toastAlreadyVerifiedTitle'),
              description: t('toastAlreadyVerifiedDesc'),
            })
          } else {
            setStatus('success')
            addToast({
              type: 'success',
              title: t('toastSuccessTitle'),
              description: hasBonus
                ? t('toastSuccessDescWithBonus', { points: welcomeBonus })
                : t('toastSuccessDescNoBonus'),
            })
          }
        } else {
          setStatus('failed')
          setErrorMessage(res.error || t('invalidLinkDesc'))
          addToast({
            type: 'error',
            title: t('toastFailedTitle'),
            description: res.error || t('toastFailedDesc'),
          })
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setStatus('failed')
        const msg = err instanceof Error ? err.message : t('toastFailedDesc')
        setErrorMessage(msg)
        addToast({ type: 'error', title: t('toastErrorTitle'), description: msg })
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [token, email, addToast, hasBonus, welcomeBonus, locale])

  // If no token, show the elevated luxury "Check your email" instruction card
  if (!token) {
    return (
      <div className="py-12 sm:py-20 min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#0A1017] via-[#0D1520] to-[#080D14] text-foreground relative overflow-hidden">
        {/* Ambient Radial Background Glows */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#00ADEE]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#F48120]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-lg mx-auto rounded-3xl border border-white/20 bg-gradient-to-b from-[#111A24] via-[#0D151F] to-[#0A1017] p-6 sm:p-8 text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(244,129,32,0.18)] overflow-hidden z-10 text-center">
          {/* Top Border Shimmer Line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F48120]/70 to-[#00ADEE]/70"
            aria-hidden="true"
          />

          {/* Emblem Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#00ADEE]/20 via-[#00ADEE]/10 to-transparent border border-[#00ADEE]/40 text-[#00ADEE] flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(0,174,239,0.3)]">
            <MailIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          {/* Badge Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00ADEE]/15 border border-[#00ADEE]/40 text-[#00ADEE] text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,174,239,0.2)] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00ADEE] animate-pulse" />
            <span>{t('accountVerification')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide">
            {t('verifyYourEmail')}
          </h1>

          {/* Points Bonus Highlight Banner */}
          {hasBonus && (
            <div className="my-4 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#F48120]/20 via-[#fbbf24]/10 to-[#00ADEE]/15 border border-[#F48120]/35 flex items-center justify-center gap-2.5 shadow-inner">
              <SparkleIcon className="w-4 h-4 text-[#fbbf24] animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-100 tracking-wide">
                {t('activateToClaim')}{' '}
                <strong className="text-transparent bg-clip-text bg-gradient-to-r from-[#F48120] to-[#fbbf24] font-hornbill text-sm sm:text-base font-normal">
                  +{welcomeBonus} {t('welcomePoints')}
                </strong>
              </span>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-sans max-w-md mx-auto">
            {t('sentLinkPrefix')}
            {email ? <strong className="text-white font-semibold underline underline-offset-4 decoration-[#00ADEE]/60">{email}</strong> : 'your email address'}
            {t('sentLinkSuffix')}
          </p>

          {/* 3-Step Guidance Indicator */}
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] sm:text-xs font-bold text-[#00ADEE] uppercase tracking-wider">{t('step1Title')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('step1Desc')}</div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] sm:text-xs font-bold text-[#F48120] uppercase tracking-wider">{t('step2Title')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('step2Desc')}</div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] sm:text-xs font-bold text-[#fbbf24] uppercase tracking-wider">{t('step3Title')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('step3Desc')}</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {email && (
              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResend}
                className="w-full min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all duration-200 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isResending
                  ? t('sendingLink')
                  : resendCooldown > 0
                    ? t('resendAvailableIn', { seconds: resendCooldown })
                    : t('resendEmail')}
              </button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-[#00ADEE] transition-colors inline-flex items-center gap-1.5 group"
            >
              <span className="transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1 rtl:rotate-180">←</span>
              <span>{t('returnToSignIn')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 sm:py-20 min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#0A1017] via-[#0D1520] to-[#080D14] text-foreground relative overflow-hidden">
      {/* Ambient Radial Background Glows */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#00ADEE]/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#F48120]/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg mx-auto rounded-3xl border border-white/20 bg-gradient-to-b from-[#111A24] via-[#0D151F] to-[#0A1017] p-6 sm:p-8 text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(244,129,32,0.18)] overflow-hidden z-10 text-center">
        {/* Top Border Shimmer Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F48120]/70 to-[#00ADEE]/70"
          aria-hidden="true"
        />

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#00ADEE]/15 border border-[#00ADEE]/30 text-[#00ADEE] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,174,239,0.3)]">
              <SpinnerIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00ADEE]/15 border border-[#00ADEE]/40 text-[#00ADEE] text-xs font-bold uppercase tracking-widest">
              <span>{t('authenticatingToken')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide">
              {t('verifyingYourEmail')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto">
              {t('verifyingDesc')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <span>{hasBonus ? t('pointsAwardedBadge', { points: welcomeBonus }) : t('accountActivatedBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide">
              {t('emailVerifiedTitle')}
            </h1>

            {/* Points Celebration Callout */}
            {hasBonus && (
              <div className="my-4 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#F48120]/20 via-[#fbbf24]/15 to-[#00ADEE]/20 border border-[#F48120]/40 flex items-center justify-center gap-3 shadow-inner">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F48120] to-[#fbbf24] flex items-center justify-center text-white shadow-[0_0_15px_rgba(244,129,32,0.5)] shrink-0">
                  <GemGiftIcon className="w-4 h-4" />
                </div>
                <div className="text-left rtl:text-right min-w-0">
                  <div className="text-xl sm:text-2xl font-hornbill text-transparent bg-clip-text bg-gradient-to-r from-[#F48120] to-[#fbbf24]">
                    {t('pointsAwardedCard', { points: welcomeBonus })}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300">
                    {t('pointsCreditedSub')}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto">
              {hasBonus ? t('successDescWithBonus', { points: welcomeBonus }) : t('successDescNoBonus')}
            </p>
            <div className="mt-6 pt-2">
              <Link
                href="/login?redirect=%2Fdashboard%3Fwelcome%3D1"
                className="w-full min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] hover:shadow-[0_15px_40px_rgba(244,129,32,0.55)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group text-center"
              >
                <span>{t('signInBtn')}</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 font-bold">→</span>
              </Link>
            </div>
          </div>
        )}

        {status === 'already_verified' && (
          <div className="space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#00ADEE]/15 border border-[#00ADEE]/30 text-[#00ADEE] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,174,239,0.3)]">
              <InfoIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00ADEE]/15 border border-[#00ADEE]/40 text-[#00ADEE] text-xs font-bold uppercase tracking-widest">
              <span>{t('statusActive')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide">
              {t('alreadyVerifiedTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto">
              {t('alreadyVerifiedDesc')}
            </p>
            <div className="mt-6 pt-2">
              <Link
                href="/login"
                className="w-full min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all duration-200 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <span>{t('proceedToLogin')}</span>
                <span className="rtl:rotate-180 font-bold">→</span>
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.35)]">
              <XCircleIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-bold uppercase tracking-widest">
              <span>{t('verificationFailed')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-white tracking-wide">
              {t('invalidLinkTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-red-300 p-3 bg-red-500/10 rounded-xl border border-red-500/20 font-medium max-w-md mx-auto">
              {errorMessage}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {t('invalidLinkDesc')}
            </p>
            <div className="mt-6 pt-2 space-y-3">
              {email && (
                <button
                  type="button"
                  disabled={isResending || resendCooldown > 0}
                  onClick={handleResend}
                  className="w-full min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all duration-200 bg-gradient-to-r from-[#F48120] via-[#f7943d] to-[#e06f10] hover:brightness-110 shadow-[0_10px_30px_rgba(244,129,32,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isResending
                    ? t('sendingLink')
                    : resendCooldown > 0
                      ? t('resendAvailableIn', { seconds: resendCooldown })
                      : t('requestNewLink')}
                </button>
              )}
              <Link
                href="/login"
                className="w-full min-h-[44px] sm:min-h-[48px] py-3 sm:py-3.5 px-5 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all duration-200 cursor-pointer text-center active:scale-[0.98] flex items-center justify-center"
              >
                {t('returnToLogin')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
