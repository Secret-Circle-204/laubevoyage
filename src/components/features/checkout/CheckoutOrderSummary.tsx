'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import type { PricingPreviewState } from './LoyaltyRedemptionSection'

const dict = new JsonTranslationDictionary()

interface CheckoutOrderSummaryProps {
  data: CheckoutPageDTO
  previewPricing: PricingPreviewState | null
  applyPoints: boolean
  isRepricing: boolean
  isSubmitting: boolean
  onConfirmPayment: () => void
  locale: string
}

function ChevronUpIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function StarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  )
}

export function CheckoutOrderSummary({
  data,
  previewPricing,
  applyPoints,
  isRepricing,
  isSubmitting,
  onConfirmPayment,
  locale,
}: CheckoutOrderSummaryProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const orderSummaryTitle = dict.get(locale, 'checkout.orderSummary') || 'Reservation Ledger'
  const confirmAndPayButton = dict.get(locale, 'checkout.confirmAndPay') || 'Confirm & Secure Journey'
  const packageLabel = dict.get(locale, 'catalog.packageLabel') || 'Package'
  const dailyTourLabel = dict.get(locale, 'catalog.dailyTourLabel') || 'Day Tour'

  const effectiveTotal = previewPricing?.totalPrice || data.totalCost
  const effectiveOriginal = previewPricing?.originalPrice || previewPricing?.unitPrice || data.subtotalPrice
  const hasLoyaltyDiscount =
    applyPoints &&
    previewPricing?.loyaltyDiscountPrice &&
    previewPricing.loyaltyDiscountPrice.convertedAmount > 0

  // Close drawer on Escape key and manage focus
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      setIsDrawerOpen(false)
      triggerRef.current?.focus()
    }
  }, [isDrawerOpen])

  useEffect(() => {
    if (isDrawerOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen, handleKeyDown])

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP RESERVATION LEDGER (Sticky Right-Rail Instrument)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:sticky lg:top-24 animate-editorial-reveal">
        <Card
          variant="flat"
          padding="none"
          className="border border-border/80 bg-card rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Top Ledger Header */}
          <div className="p-5 border-b border-border/70 bg-card-elevated/50 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-secondary uppercase font-semibold">
                FINANCIAL LEDGER
              </span>
              <h3 className="text-lg font-hornbill font-semibold text-foreground tracking-tight mt-0.5">
                {orderSummaryTitle}
              </h3>
            </div>
            <Badge variant="outline" size="sm" className="text-[10px] uppercase border-secondary/30 text-secondary bg-secondary/5 font-semibold">
              {data.experienceType === 'package' ? packageLabel : dailyTourLabel}
            </Badge>
          </div>

          <div className="p-5 flex flex-col gap-5">
            {/* Experience Overview Item */}
            <div className="flex gap-3.5 items-center p-3 rounded-xl bg-card-elevated/60 border border-border/60">
              {data.imageUrl && (
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0 border border-border/80"
                  style={{ backgroundImage: `url(${data.imageUrl})` }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-hornbill font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                  {data.experienceTitle}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
                  <span>{data.departureDate}</span>
                  {data.destinationCityName && (
                    <>
                      <span>•</span>
                      <span>{data.destinationCityName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Itemized Calculations Breakdown */}
            <div className="flex flex-col gap-3 text-xs pt-2">
              {/* Passengers Base */}
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-medium">
                  Travelers ({data.adultsCount} Adult{data.adultsCount > 1 ? 's' : ''}
                  {data.childrenCount > 0 ? `, ${data.childrenCount} Child${data.childrenCount > 1 ? 'ren' : ''}` : ''})
                </span>
                <CurrencyDisplay price={effectiveOriginal} size="sm" className="text-foreground font-medium" />
              </div>

              {/* Loyalty Credit Discount */}
              {hasLoyaltyDiscount && previewPricing?.loyaltyDiscountPrice && (
                <div className="flex justify-between items-center text-secondary font-medium bg-secondary/10 px-3 py-2 rounded-xl border border-secondary/25">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <StarIcon className="w-3.5 h-3.5" />
                    <span>Loyalty Member Credit</span>
                  </span>
                  <span className="font-bold">-{previewPricing.loyaltyDiscountPrice.formatted}</span>
                </div>
              )}

              {/* Authoritative Total */}
              <div className="flex justify-between items-baseline pt-4 border-t border-border/80 mt-1">
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                    Total Due
                  </span>
                  {isRepricing && (
                    <span className="text-[10px] text-secondary animate-pulse font-medium">
                      Updating pricing...
                    </span>
                  )}
                </div>
                <CurrencyDisplay
                  price={effectiveTotal}
                  size="lg"
                  className="font-hornbill font-bold text-foreground text-2xl"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md tracking-wide mt-1 py-3.5 text-sm cursor-pointer"
              isLoading={isSubmitting}
              onClick={onConfirmPayment}
            >
              {confirmAndPayButton}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground font-medium">
              Direct provider settlement • Guaranteed reservation
            </p>
          </div>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE SMART RESERVATION DOCK (Persistent Bottom Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-4 py-3 shadow-2xl safe-area-pb">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Left Dock Trigger: Authoritative Price + Expand Affordance */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className="flex flex-col text-left min-w-0 pr-2 group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-secondary rounded-lg"
          >
            <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1 group-hover:text-secondary transition-colors font-semibold">
              <span>Reservation Ledger</span>
              <ChevronUpIcon className="w-3 h-3 text-secondary group-hover:-translate-y-0.5 transition-transform" />
            </span>
            <div className="flex items-baseline gap-1.5">
              <CurrencyDisplay
                price={effectiveTotal}
                size="md"
                className="font-hornbill font-bold text-foreground truncate text-lg"
              />
              {isRepricing && (
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
              )}
            </div>
          </button>

          {/* Right Primary Action */}
          <Button
            variant="primary"
            size="md"
            className="font-bold shadow-md px-5 tracking-wide flex-shrink-0 text-xs py-2.5 cursor-pointer"
            isLoading={isSubmitting}
            onClick={onConfirmPayment}
          >
            {confirmAndPayButton}
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE SMART BOTTOM SHEET DRAWER (Expanded Ledger Surface)
      ───────────────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reservation Ledger"
            className="relative z-50 bg-card border-t border-x border-border/80 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-editorial-reveal safe-area-pb"
          >
            {/* Grab handle indicator */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-1" />

            {/* Drawer Header */}
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary uppercase font-semibold">
                  RESERVATION VAULT
                </span>
                <h3 className="text-base font-hornbill font-semibold text-foreground">
                  {orderSummaryTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-card-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-secondary/40 transition-colors cursor-pointer"
                aria-label="Close Reservation Ledger"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Itemized Breakdown */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Experience Item */}
              <div className="flex gap-3 items-center p-3.5 rounded-xl bg-card-elevated/70 border border-border/60">
                {data.imageUrl && (
                  <div
                    className="w-12 h-12 rounded-lg bg-cover bg-center flex-shrink-0 border border-border"
                    style={{ backgroundImage: `url(${data.imageUrl})` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-hornbill font-semibold text-xs text-foreground line-clamp-2">
                    {data.experienceTitle}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-medium">
                    <span>{data.departureDate}</span>
                    {data.destinationCityName && (
                      <>
                        <span>•</span>
                        <span>{data.destinationCityName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Itemized Calculations */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Travelers ({data.adultsCount} Adult{data.adultsCount > 1 ? 's' : ''}
                    {data.childrenCount > 0 ? `, ${data.childrenCount} Child` : ''})
                  </span>
                  <CurrencyDisplay price={effectiveOriginal} size="sm" className="text-foreground font-medium" />
                </div>

                {hasLoyaltyDiscount && previewPricing?.loyaltyDiscountPrice && (
                  <div className="flex justify-between text-secondary font-medium bg-secondary/10 p-2.5 rounded-xl border border-secondary/25">
                    <span className="text-xs inline-flex items-center gap-1.5 font-semibold">
                      <StarIcon className="w-3.5 h-3.5" />
                      <span>Loyalty Member Credit</span>
                    </span>
                    <span className="font-bold">-{previewPricing.loyaltyDiscountPrice.formatted}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Fixed Action Footer */}
            <div className="p-5 border-t border-border bg-card-elevated/80 flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase text-muted-foreground font-semibold">
                  Total Due
                </span>
                <CurrencyDisplay
                  price={effectiveTotal}
                  size="lg"
                  className="font-hornbill font-bold text-foreground text-2xl"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md tracking-wide py-3.5 text-sm cursor-pointer"
                isLoading={isSubmitting}
                onClick={() => {
                  setIsDrawerOpen(false)
                  onConfirmPayment()
                }}
              >
                {confirmAndPayButton}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
