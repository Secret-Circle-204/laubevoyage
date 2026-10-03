'use client'

import React from 'react'
import { Card } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { ConvertedPrice } from '@/domains/currency/types'

const dict = new JsonTranslationDictionary()

// Luxury Brand SVG Icons
function WalletIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path strokeLinecap="round" d="M3 10h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 14.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor" />
      <path strokeLinecap="round" d="M7 4h10" opacity={0.6} />
    </svg>
  )
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function MinusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

export interface PricingPreviewState {
  unitPrice: ConvertedPrice
  totalPrice: ConvertedPrice
  originalPrice?: ConvertedPrice
  loyaltyDiscountPrice?: ConvertedPrice
  estimatedEarnPoints?: number
  remainingLoyaltyPoints?: number
}

interface LoyaltyRedemptionSectionProps {
  availableLoyaltyPoints: number
  minRedemptionPoints: number
  redemptionStepUnit: number
  applyPoints: boolean
  pointsToRedeem: number | string
  previewPricing: PricingPreviewState | null
  isRepricing: boolean
  effectivePricingError: string | null
  onToggleApplyPoints: (checked: boolean) => void
  onChangePointsToRedeem: (value: number | string) => void
  locale: string
}

export function LoyaltyRedemptionSection({
  availableLoyaltyPoints,
  minRedemptionPoints,
  redemptionStepUnit,
  applyPoints,
  pointsToRedeem,
  previewPricing,
  isRepricing,
  effectivePricingError,
  onToggleApplyPoints,
  onChangePointsToRedeem,
  locale,
}: LoyaltyRedemptionSectionProps) {
  if (availableLoyaltyPoints <= 0) {
    return null
  }

  const isArabic = locale === 'ar' || locale?.startsWith('ar')
  const step = redemptionStepUnit > 0 ? redemptionStepUnit : 50
  const min = minRedemptionPoints > 0 ? minRedemptionPoints : step
  // Enforce step multiple on maximum allowable points so it never violates policy:
  const maxAllowablePoints = Math.floor(availableLoyaltyPoints / step) * step

  const currentPointsNum =
    applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
      ? pointsToRedeem
      : applyPoints && pointsToRedeem !== '' && !isNaN(Number(pointsToRedeem))
        ? Number(pointsToRedeem)
        : 0

  const handleIncrement = () => {
    const current = currentPointsNum > 0 ? currentPointsNum : min
    const next = Math.min(maxAllowablePoints, current + step)
    onChangePointsToRedeem(next)
  }

  const handleDecrement = () => {
    const current = currentPointsNum > 0 ? currentPointsNum : min
    const next = Math.max(min, current - step)
    onChangePointsToRedeem(next)
  }

  const handleUseAll = () => {
    onChangePointsToRedeem(maxAllowablePoints)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') {
      onChangePointsToRedeem('')
      return
    }
    const num = parseInt(raw, 10)
    onChangePointsToRedeem(isNaN(num) ? '' : num)
  }

  const handleInputBlur = () => {
    if (pointsToRedeem === '' || Number(pointsToRedeem) < min) {
      onChangePointsToRedeem(min)
    } else if (Number(pointsToRedeem) > maxAllowablePoints) {
      onChangePointsToRedeem(maxAllowablePoints)
    } else {
      // Snap to nearest multiple of step if user entered off-step number
      const num = Number(pointsToRedeem)
      const remainder = num % step
      if (remainder !== 0) {
        const snapped = Math.round(num / step) * step
        onChangePointsToRedeem(Math.min(maxAllowablePoints, Math.max(min, snapped)))
      }
    }
  }

  const remainingBalance =
    previewPricing?.remainingLoyaltyPoints !== undefined
      ? previewPricing.remainingLoyaltyPoints
      : Math.max(0, availableLoyaltyPoints - currentPointsNum)

  const sectionTitle =
    dict.get(locale, 'checkout.applyLoyaltyPoints') ||
    (isArabic ? 'استخدم نقاطك المتاحة' : 'Use your points')

  return (
    <Card
      variant="flat"
      padding="lg"
      className="relative overflow-hidden border border-border/70 bg-gradient-to-b from-white via-card-elevated/80 to-card/30 dark:from-card dark:via-card dark:to-card rounded-2xl shadow-xs"
    >
      {/* Subtle Luxury Atmospheric Blooms for Light & Dark Modes */}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/12 via-secondary/5 to-transparent pointer-events-none blur-3xl opacity-75"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-accent/12 via-accent/5 to-transparent pointer-events-none blur-3xl opacity-75"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Section Header with Customer Language */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-white text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
              02
            </span>
            <div>
              <span className="text-[10px] text-secondary uppercase font-semibold block tracking-wider">
                {isArabic ? 'مكافآت الولاء' : 'LOYALTY REWARDS'}
              </span>
              <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
                {sectionTitle}
              </h2>
            </div>
          </div>
        </div>

        {/* 1. Prominent Luxury Wallet Balance Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-card-elevated via-card to-card-elevated/80 border border-border/80 shadow-xs mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 text-secondary flex items-center justify-center shrink-0 shadow-xs">
              <WalletIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  {isArabic ? 'رصيد محفظة النقاط' : 'YOUR POINTS BALANCE'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-hornbill text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {availableLoyaltyPoints.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {isArabic ? 'نقطة معتمدة' : 'pts available'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {isArabic
                  ? 'رصيدك المعتمد متاح لتخفيض قيمة هذا الحجز مباشرة'
                  : 'Available to use toward this reservation'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Interactive Toggle Switch Card */}
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card-elevated/80 border border-border/80 hover:border-secondary/40 transition-colors cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={applyPoints}
                onChange={(e) => {
                  onToggleApplyPoints(e.target.checked)
                  if (e.target.checked && pointsToRedeem === '') {
                    onChangePointsToRedeem(min)
                  }
                }}
                className="w-5 h-5 rounded border-border text-secondary focus:ring-secondary accent-secondary bg-background cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  {isArabic ? 'تفعيل خصم النقاط على هذا الحجز' : 'Redeem points for this booking'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'استخدم جزءاً من رصيدك للحصول على خصم مالي فوري'
                    : 'Apply your points balance to reduce the total reservation cost'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-secondary hidden sm:inline-block">
              {applyPoints
                ? (isArabic ? 'مفعل ✓' : 'Active ✓')
                : (isArabic ? 'استبدال فوري ←' : 'Redeem Now →')}
            </span>
          </label>

          {/* 3. Expanded Points Stepper & Integrated Summary */}
          {applyPoints && (
            <div className="pt-2 flex flex-col gap-4 animate-editorial-reveal">
              {/* Stepper Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card-elevated/90 border border-border/80 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="loyalty-points-input" className="text-xs sm:text-sm font-semibold text-foreground">
                    {isArabic ? 'كم نقطة تود استخدامها؟' : 'How many points would you like to use?'}
                  </label>
                  {isRepricing && (
                    <span className="text-[11px] text-secondary font-medium animate-pulse">
                      {isArabic ? 'جاري تحديث السعر...' : 'Updating price...'}
                    </span>
                  )}
                </div>

                {/* Physical Stepper Control with High Contrast in Dark Mode */}
                <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-white/70 dark:bg-dark/80 border border-border/80 shadow-xs focus-within:ring-2 focus-within:ring-secondary/40 focus-within:border-secondary transition-all">
                  {/* Decrement Button */}
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={currentPointsNum <= min}
                    aria-label={isArabic ? 'تقليل النقاط' : 'Decrease points'}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-card-elevated hover:bg-secondary/15 hover:border-secondary/40 active:scale-95 text-foreground hover:text-secondary border border-border/70 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>

                  {/* Numeric Input & Suffix Unit */}
                  <div className="relative flex-1 flex items-center justify-center">
                    <input
                      id="loyalty-points-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pointsToRedeem === '' ? '' : currentPointsNum}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      aria-label={isArabic ? 'عدد النقاط المستخدمة' : 'Number of points to redeem'}
                      className="w-full text-center py-2 px-3 rounded-xl bg-transparent font-hornbill font-bold text-2xl sm:text-3xl text-foreground focus:outline-none"
                    />
                    <span className="absolute right-4 rtl:left-4 rtl:right-auto text-xs font-semibold text-secondary uppercase tracking-wider select-none pointer-events-none">
                      {isArabic ? 'نقطة' : 'pts'}
                    </span>
                  </div>

                  {/* Increment Button */}
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={currentPointsNum >= maxAllowablePoints}
                    aria-label={isArabic ? 'زيادة النقاط' : 'Increase points'}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-card-elevated hover:bg-secondary/15 hover:border-secondary/40 active:scale-95 text-foreground hover:text-secondary border border-border/70 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Helper Row: Increments rule + Quick Action "Use all points" */}
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs pt-1 px-1">
                  <span className="text-foreground/60 font-medium">
                    {isArabic
                      ? `مضاعفات ${step} نقطة · الحد الأقصى: ${maxAllowablePoints.toLocaleString()} نقطة`
                      : `${step}-point increments · Maximum available: ${maxAllowablePoints.toLocaleString()} pts`}
                  </span>

                  <button
                    type="button"
                    onClick={handleUseAll}
                    disabled={currentPointsNum === maxAllowablePoints}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 text-secondary" />
                    <span>{isArabic ? 'استخدام كل النقاط' : 'Use all points'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Integrated Redemption Receipt Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card-elevated/70 border border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* You'll Apply & Credit Value */}
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                    {isArabic ? 'النقاط المطبقة للتخفيض' : "You'll apply"}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-hornbill text-xl sm:text-2xl font-bold text-foreground">
                      {currentPointsNum.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {isArabic ? 'نقطة' : 'pts'}
                    </span>
                    {previewPricing?.loyaltyDiscountPrice && previewPricing.loyaltyDiscountPrice.convertedAmount > 0 ? (
                      <span className="inline-flex items-center text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-lg border border-secondary/20">
                        <span>{previewPricing.loyaltyDiscountPrice.formatted}</span>
                      </span>
                    ) : isRepricing ? (
                      <span className="text-xs text-muted-foreground animate-pulse font-medium">
                        {isArabic ? 'جاري حساب الخصم...' : 'Calculating credit...'}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-border/60" aria-hidden="true" />

                {/* Remaining Balance */}
                <div className="flex-1 sm:text-right rtl:sm:text-left">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                    {isArabic ? 'الرصيد المتبقي بعد الحجز' : 'Remaining balance'}
                  </span>
                  <div className="flex items-baseline sm:justify-end rtl:sm:justify-start gap-2">
                    <span className="font-hornbill text-xl sm:text-2xl font-bold text-foreground">
                      {remainingBalance.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {isArabic ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Alert if any */}
              {effectivePricingError && (
                <div className="text-xs text-accent bg-accent/10 p-3.5 rounded-xl border border-accent/30 font-medium flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 text-accent shrink-0" />
                  <span>{effectivePricingError}</span>
                </div>
              )}

              {/* 5. Customer-Facing Reassurance Footnote */}
              <div className="flex items-center gap-2 pt-1 text-xs text-foreground/65">
                <ShieldCheckIcon className="w-4 h-4 text-secondary shrink-0" />
                <span>
                  {isArabic
                    ? 'سيتم تطبيق خصم نقاطك وتخفيض التكلفة الإجمالية مباشرة عند تأكيد حجزك.'
                    : 'Your points will be applied to this reservation when you confirm your booking.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
