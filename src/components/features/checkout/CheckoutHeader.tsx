'use client'

import React from 'react'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

const dict = new JsonTranslationDictionary()

export interface CheckoutHeaderProps {
  bookingId: string
  locale: string
}

export function CheckoutHeader({ bookingId, locale }: CheckoutHeaderProps) {
  const isArabic = locale === 'ar' || locale?.startsWith('ar')
  const rawTitle = dict.get(locale, 'checkout.pageTitle')
  const pageTitle =
    !rawTitle || rawTitle === 'checkout.pageTitle'
      ? isArabic
        ? 'إتمام حجز رحلتك الاستثنائية'
        : 'Complete Your Journey Reservation'
      : rawTitle

  return (
    <header className="mb-8 sm:mb-10 text-center max-w-3xl mx-auto animate-editorial-reveal">
      {/* Sovereign Vault Waypoint Supra Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 border border-secondary/25 text-xs font-semibold uppercase text-secondary mb-3 shadow-xs backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        <span>{isArabic ? 'بوابة الحجز المؤكد' : 'The Sovereign Vault'}</span>
      </div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-hornbill font-light text-foreground tracking-tight leading-tight">
        {pageTitle}
      </h1>

      <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="uppercase font-medium text-[11px]">
          {isArabic ? 'المرجع التعريفي للحجز:' : 'Manifest Reference:'}
        </span>
        <span className="font-bold text-foreground px-2.5 py-0.5 rounded-md bg-card-elevated border border-border/80 select-all shadow-xs">
          {bookingId}
        </span>
      </div>
    </header>
  )
}
