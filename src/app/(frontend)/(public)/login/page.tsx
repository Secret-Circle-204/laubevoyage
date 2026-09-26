import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'
import { SessionResolver } from '@/application/auth/session-resolver'
import { getLocaleContext } from '@/lib/get-locale-context'
import { getDomainServices } from '@/domains/factory'

export const metadata: Metadata = {
  title: "Traveler Sign In | L'Aube Voyage",
  description: 'Sign in to access your luxury travel bookings and loyalty ledger.',
}

export default async function LoginPage(props: {
  searchParams?: Promise<{ redirect?: string }>
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const redirectTarget =
    searchParams?.redirect &&
    searchParams.redirect.startsWith('/') &&
    !searchParams.redirect.startsWith('//')
      ? searchParams.redirect
      : '/dashboard'

  const session = await SessionResolver.resolve()
  const isCustomer =
    session.isAuthenticated && session.role === 'customer' && !!session.customerId

  if (isCustomer) {
    redirect(redirectTarget)
  }

  const isAdminSession =
    session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin')

  const ctx = await getLocaleContext()
  const { localization } = await getDomainServices()

  const loyaltyConfig = await CustomerLoyaltyLoader.loadPublicConfig()
  const welcomeBonus = loyaltyConfig.welcomeBonus
  const hasBonus = typeof welcomeBonus === 'number' && welcomeBonus > 0

  const customerPortal = localization.translateUiKey('auth.customerPortal', ctx)
  const welcomeBack = localization.translateUiKey('auth.welcomeBack', ctx)
  const signInSubtitle = localization.translateUiKey('auth.signInSubtitle', ctx)
  const dontHaveAccount = localization.translateUiKey('auth.dontHaveAccount', ctx)
  const createAccount = localization.translateUiKey('auth.createAccount', ctx)
  const signInLink = localization.translateUiKey('auth.signInLink', ctx)

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-[#231F20] text-slate-100 flex items-center justify-center pt-24 pb-20 sm:pt-28 sm:pb-24 lg:pt-32 lg:pb-28 px-4 sm:px-6 lg:px-8 selection:bg-[#00ADEE]/30 selection:text-white font-sans">
      {/* ========================================================================= */}
      {/* 1. CRYSTAL-CLEAR LUXURY BACKGROUND + DELICATE STREAM ACCENTS */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Official Background Image - 100% High Definition */}
        <Image
          src="/images/auth-bg.png"
          alt="L'Aube Voyage Luxury Atmosphere"
          fill
          sizes="100vw"
          className="object-cover object-center opacity-95 scale-100"
          priority
        />

        {/* Ultra-Light Cinematic Vignette (Preserves maximum image visibility) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#231F20]/50 via-[#231F20]/20 to-[#231F20]/65" />

        {/* Subtle Animated Flight Trajectory Stream Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M -100,200 Q 400,100 900,450 T 2000,300"
            fill="none"
            stroke="url(#flightGradCyan)"
            strokeWidth="1.5"
            className="animate-flight-stream"
          />
          <path
            d="M -100,500 Q 500,700 1100,300 T 2100,600"
            fill="none"
            stroke="url(#flightGradOrange)"
            strokeWidth="1.5"
            className="animate-flight-stream"
          />
          <defs>
            <linearGradient id="flightGradCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2E3191" stopOpacity="0" />
              <stop offset="50%" stopColor="#00ADEE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00ADEE" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="flightGradOrange" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2E3191" stopOpacity="0" />
              <stop offset="50%" stopColor="#F48120" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F48120" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Drifting Stardust Particles */}
        <div className="absolute top-1/4 left-1/6 w-2.5 h-2.5 rounded-full bg-[#00ADEE] blur-[1px] animate-float-particle-1" />
        <div className="absolute top-1/3 right-1/5 w-3 h-3 rounded-full bg-[#F48120] blur-[1px] animate-float-particle-2" />
        <div className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 rounded-full bg-[#00ADEE] blur-[1px] animate-float-particle-3" />
        <div className="absolute top-2/3 right-1/4 w-2 h-2 rounded-full bg-[#F48120] blur-[1px] animate-float-particle-1" />
      </div>

      {/* ========================================================================= */}
      {/* 2. CRYSTAL FROSTED GLASS CONSOLE (IMAGE VISIBLE THROUGH GLASS) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto mt-20 sm:mt-20 lg:mt-12 animate-editorial-reveal">
        {/* Outer Luminous Hairline Frame */}
        <div className="relative rounded-[32px] p-[1.5px] bg-gradient-to-b from-[#00ADEE]/70 via-white/30 to-[#F48120]/70 shadow-md shadow-black/20">
          {/* Main Console Split Body - Lightweight Frosted Glass */}
          <div className="relative rounded-[30px] bg-[#231F20]/45 backdrop-blur-md border border-white/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Top Multi-Color Brand Hairline */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#2E3191] via-[#00ADEE] to-[#F48120] z-20" />

            {/* ===================================================================== */}
            {/* LEFT WING: BRAND HERITAGE & ATMOSPHERE (Desktop Col 5) */}
            {/* ===================================================================== */}
            <div className="lg:col-span-5 p-7 sm:p-9 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/15 bg-gradient-to-b from-black/20 via-transparent to-[#2E3191]/15 relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                {/* Brand Emblem */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_4px_24px_rgba(244,129,32,0.5)] transition-transform duration-300 hover:scale-105 cursor-pointer">
                  <svg viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Sun Crest Top Arc (#F48120) */}
                    <path
                      d="M38.6 34.5l1 0.2C42 20.8 52.7 6.4 69.1 4.4C65.6 7.9 47.6 16 45.8 36.6c3.2 1.1 6.2 2.4 8.9 3.7c7.3 3.1 15.4 4.1 23.3 2.9l1.1-0.1c1.7-0.4 3.1-0.8 4.3-1.1c0.9-0.2 1.7-0.4 2.5-0.7c1.5-0.5 3-1 4.6-1.6c6.3-2.3 12.1-4.7 18.8-5.7c1.8-0.3 3.6-0.5 5.4-0.6c-0.1-0.5-0.2-1.2-0.3-1.6C111.6 13.8 95 0 74.8 0C54 0 36.8 14.9 35.1 33.8C36.2 34 37.4 34.2 38.6 34.5"
                      fill="#F48120"
                    />
                    {/* Royal Indigo Wave (#2E3191) */}
                    <path
                      d="M44.5 64c18.2 17.8 30.7 8.9 47.7-4.2c22.2-17.1 21-17.9 48.5-19.4c-5.4-4-21.1-4.8-28.7-3.6c-4.7 0.7-9.2 2.3-13.3 4.7c-6.4 3.6-12.4 9.4-19.1 14.1c-13 9.1-15.8 9.7-27.1 9.3C50.2 64.8 47.6 64.1 44.5 64"
                      fill="#2E3191"
                    />
                    <path
                      d="M74.5 56.2c-19.6 0.4-22.8-1.3-36.5-9.6c-9-5.5-24.9-9.5-33.2-1c13.5 0.2 21.2 4.5 28.1 8.5c8.9 5.3 13.6 8.1 24 7.8C63.6 61.8 70.9 59.3 74.5 56.2"
                      fill="#2E3191"
                    />
                    {/* Sky Cyan Wave (#00ADEE) */}
                    <path
                      d="M88.3 44.7c-10 1.4-15.5 2.8-22.5 2c-7.7-0.9-12.2-3.6-19-6.1c-7.4-2.8-18.7-5.8-25.7-2.8c4.6 1 9.2 2.3 13.7 3.7c6.3 2.2 11.4 6.3 17.5 9.1C64.9 56.4 78.3 54.6 88.3 44.7"
                      fill="#00ADEE"
                    />
                    <path
                      d="M80.5 71c5.3 0.5 10.6-0.4 15.5-2.5c6.3-2.8 9.4-6.1 14.2-10.8c5.6-5.6 12.4-12.6 12.5-12.8c-9.3 1.7-16.7 7.5-22.1 12.3C89.7 66.8 88.4 66.8 80.5 71"
                      fill="#00ADEE"
                    />
                  </svg>
                </div>

                {/* Badge Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ADEE]/15 border border-[#00ADEE]/40 text-[#00ADEE] text-xs font-semibold tracking-wide shadow-[0_0_15px_rgba(0,174,239,0.25)]">
                  <span className="w-2 h-2 rounded-full bg-[#00ADEE] animate-pulse" />
                  <span>{customerPortal}</span>
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-white tracking-tight leading-tight drop-shadow-md">
                    {welcomeBack}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed drop-shadow-sm">
                    {signInSubtitle}
                  </p>
                </div>
              </div>

              {/* Dynamic Loyalty / Experience Feature Chip */}
              <div className="mt-8 pt-6 border-t border-white/15 space-y-3">
                {hasBonus ? (
                  <div className="p-3.5 rounded-2xl bg-[#F48120]/15 border border-[#F48120]/35 flex items-center gap-3 shadow-[0_0_20px_rgba(244,129,32,0.2)]">
                    <div className="w-8 h-8 rounded-xl bg-[#F48120] text-white flex items-center justify-center font-bold text-xs shadow-md">
                      ★
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        {welcomeBonus} Bonus Points
                      </div>
                      <div className="text-[11px] text-slate-200">
                        Awarded automatically upon registration
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-300 font-sans tracking-wide">
                    L&apos;Aube Voyage • Travel More, Worry Less
                  </div>
                )}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* RIGHT WING: INTERACTIVE FORM CONSOLE (Desktop Col 7) */}
            {/* ===================================================================== */}
            <div className="lg:col-span-7 p-7 sm:p-9 lg:p-10 flex flex-col justify-center bg-black/20 backdrop-blur-sm">
              {/* Dynamic Mode Switcher Tab Bar */}
              <div className="flex items-center justify-end mb-6">
                <div className="inline-flex p-1 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 shadow-inner">
                  <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00ADEE]/30 to-[#2E3191]/40 border border-[#00ADEE]/50 text-white text-xs font-bold tracking-wider uppercase flex items-center gap-2 shadow-[0_0_12px_rgba(0,174,239,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ADEE] animate-pulse" />
                    <span>{signInLink || 'Sign In'}</span>
                  </div>
                  <Link
                    href="/register"
                    className="px-4 py-1.5 rounded-xl text-slate-300 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span>{createAccount || 'Register'}</span>
                    {hasBonus && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#F48120]/20 text-[#F48120] text-[10px] font-bold group-hover:bg-[#F48120] group-hover:text-white transition-all">
                        +{welcomeBonus}
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {/* Staff Session Notice (Zero redirect, clear UX) */}
              {isAdminSession && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#2E3191]/40 border border-[#00ADEE]/40 text-slate-200 text-xs flex items-start gap-2.5">
                  <span className="text-[#00ADEE] text-base leading-none">ℹ</span>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">Staff Account Active</span>
                    <span>You are currently signed in with a Staff account. To continue as a traveler, please sign in with a customer account or return to the{' '}</span>
                    <Link href="/admin" className="text-[#00ADEE] hover:underline font-bold">
                      Admin Portal →
                    </Link>
                  </div>
                </div>
              )}

              {/* Login Form Client Component */}
              <Suspense
                fallback={
                  <div className="py-8 text-center text-xs text-[#00ADEE] animate-pulse font-mono">
                    INITIALIZING SECURE PORTAL...
                  </div>
                }
              >
                <LoginForm welcomeBonus={welcomeBonus} />
              </Suspense>

              {/* Footer Switcher */}
              <div className="mt-6 pt-4 border-t border-white/15 text-center sm:text-left text-xs text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>{dontHaveAccount}</span>
                <Link
                  href="/register"
                  className="font-semibold text-[#F48120] hover:text-[#ff9d47] transition-all duration-200 inline-flex items-center gap-1 group"
                >
                  <span>{hasBonus ? `Join & Claim ${welcomeBonus} Points` : createAccount}</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
