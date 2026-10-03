'use client'

import React from 'react'
import { Card } from '@/components/ui'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'

// Luxury Brand SVG Icons
function CreditCardIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function CalendarCheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m9 15 2 2 4-4" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  )
}

function LockClosedIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function CheckCircleMicroIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  )
}

function DefaultPaymentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" />
    </svg>
  )
}

interface PaymentGatewaySectionProps {
  gateways: CheckoutPageDTO['gateways']
  selectedGateway: string
  onSelectGateway: (id: string) => void
  locale: string
}

export function PaymentGatewaySection({
  gateways,
  selectedGateway,
  onSelectGateway,
  locale,
}: PaymentGatewaySectionProps) {
  const isArabic = locale === 'ar' || locale?.startsWith('ar')

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

      {/* Section Header */}
      <div className="relative z-10 flex items-center justify-between mb-2 flex-wrap gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-white text-sm font-hornbill font-bold flex items-center justify-center shrink-0 shadow-xs">
            03
          </span>
          <div>
            <span className="text-[10px] text-secondary uppercase font-semibold block tracking-wider">
              {isArabic ? 'الدفع وتأكيد الحجز' : 'PAYMENT SELECTION'}
            </span>
            <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground tracking-tight">
              {isArabic ? 'كيف تود إتمام حجزك؟' : 'How would you like to complete your booking?'}
            </h2>
          </div>
        </div>
      </div>

      <p className="relative z-10 text-xs text-foreground/65 mb-5 leading-relaxed">
        {isArabic
          ? 'اختر الطريقة المناسبة لمتابعة وتأكيد رحلتك الاستثنائية.'
          : 'Choose how you’d like to proceed with your reservation.'}
      </p>

      {/* Side-by-Side Dual Luxury Cards Grid with Rich Light & Dark Mode Gradients */}
      <div
        role="radiogroup"
        aria-label={isArabic ? 'خيارات الدفع والحجز' : 'Payment and reservation options'}
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5"
      >
        {gateways.map((gw) => {
          const isSelected = selectedGateway === gw.id
          const isStripe = gw.id === 'stripe'
          const isBnpl = gw.id === 'bnpl'

          return (
            <button
              key={gw.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectGateway(gw.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  onSelectGateway(gw.id)
                }
              }}
              className={`group relative overflow-hidden text-left rtl:text-right p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80 ${
                isSelected
                  ? isBnpl
                    ? 'border-accent bg-gradient-to-br from-white via-white/80 to-accent/[0.14] dark:from-card-elevated dark:via-card dark:to-accent/[0.12] ring-2 ring-accent/35 shadow-[0_12px_32px_rgba(245,130,32,0.18)] dark:shadow-[0_0_35px_rgba(245,130,32,0.14)]'
                    : 'border-secondary bg-gradient-to-br from-white via-white/80 to-secondary/[0.14] dark:from-card-elevated dark:via-card dark:to-secondary/[0.12] ring-2 ring-secondary/35 shadow-[0_12px_32px_rgba(0,174,239,0.18)] dark:shadow-[0_0_35px_rgba(0,174,239,0.14)]'
                  : isBnpl
                    ? 'border-border/75 bg-gradient-to-b from-white via-card-elevated/90 to-card/40 dark:from-card/85 dark:via-card/70 dark:to-card/50 hover:border-accent/50 hover:from-white hover:to-accent/[0.06] dark:hover:from-card-elevated dark:hover:to-card shadow-2xs'
                    : 'border-border/75 bg-gradient-to-b from-white via-card-elevated/90 to-card/40 dark:from-card/85 dark:via-card/70 dark:to-card/50 hover:border-secondary/50 hover:from-white hover:to-secondary/[0.06] dark:hover:from-card-elevated dark:hover:to-card shadow-2xs'
              }`}
            >
              {/* Top Luminous Ambient Edge Line */}
              <div
                className={`absolute top-0 inset-x-0 h-[2.5px] transition-all duration-300 ${
                  isSelected
                    ? isBnpl
                      ? 'bg-gradient-to-r from-accent/20 via-accent to-accent/20 opacity-100'
                      : 'bg-gradient-to-r from-secondary/20 via-secondary to-secondary/20 opacity-100'
                    : 'bg-transparent opacity-0 group-hover:opacity-100 group-hover:bg-gradient-to-r ' +
                      (isBnpl
                        ? 'group-hover:from-transparent group-hover:via-accent/40 group-hover:to-transparent'
                        : 'group-hover:from-transparent group-hover:via-secondary/40 group-hover:to-transparent')
                }`}
                aria-hidden="true"
              />

              <div>
                {/* Top Row: Radio/Status Pill & Method Icon */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? isBnpl
                            ? 'border-accent bg-accent text-white shadow-xs'
                            : 'border-secondary bg-secondary text-white shadow-xs'
                          : 'border-border/80 bg-white/90 dark:bg-background/50 group-hover:border-secondary/60'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-2xs" />}
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? isBnpl
                            ? 'bg-accent/15 text-accent border border-accent/30 shadow-2xs'
                            : 'bg-secondary/15 text-secondary border border-secondary/30 shadow-2xs'
                          : 'text-foreground/55 bg-white/80 dark:bg-background/40 border border-border/50 group-hover:text-foreground/80'
                      }`}
                    >
                      {isSelected
                        ? (isArabic ? 'تم الاختيار' : 'Selected')
                        : (isArabic ? 'اختيار' : 'Select')}
                    </span>
                  </div>

                  {/* Method Luxury Icon Badge */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isBnpl
                        ? isSelected
                          ? 'bg-gradient-to-br from-accent/25 via-accent/10 to-white dark:to-card-elevated text-accent border border-accent/35 shadow-xs'
                          : 'bg-gradient-to-br from-white to-card-elevated dark:from-background/60 dark:to-card text-foreground/60 border border-border/60 group-hover:text-accent group-hover:border-accent/40 group-hover:from-accent/5'
                        : isSelected
                          ? 'bg-gradient-to-br from-secondary/25 via-secondary/10 to-white dark:to-card-elevated text-secondary border border-secondary/35 shadow-xs'
                          : 'bg-gradient-to-br from-white to-card-elevated dark:from-background/60 dark:to-card text-foreground/60 border border-border/60 group-hover:text-secondary group-hover:border-secondary/40 group-hover:from-secondary/5'
                    }`}
                    aria-hidden="true"
                  >
                    {isStripe ? (
                      <CreditCardIcon className="w-5 h-5" />
                    ) : isBnpl ? (
                      <CalendarCheckIcon className="w-5 h-5" />
                    ) : (
                      <DefaultPaymentIcon className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Title & Badge */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-hornbill font-semibold text-lg sm:text-xl text-foreground tracking-tight">
                      {isStripe
                        ? isArabic
                          ? 'الدفع الإلكتروني المباشر'
                          : 'Pay Online'
                        : isBnpl
                          ? isArabic
                            ? 'طلب حجز مسبق'
                            : 'Request a Reservation'
                          : gw.name}
                    </h3>

                    {isBnpl && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/30 tracking-wide">
                        <ClockIcon className="w-3 h-3" />
                        <span>{isArabic ? 'احجز الآن، وادفع لاحقاً' : 'Book Now, Pay Later'}</span>
                      </span>
                    )}

                    {isStripe && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-md border border-secondary/20">
                        <ShieldCheckIcon className="w-3 h-3 text-secondary" />
                        <span>{isArabic ? 'تأكيد فوري' : 'Instant Confirmation'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
                    {isStripe
                      ? isArabic
                        ? 'سداد فوري وآمن بالبطاقات الائتمانية مع تثبيت فوري للمقاعد والفاوتشر.'
                        : 'Instant card settlement with guaranteed seat confirmation.'
                      : isBnpl
                        ? isArabic
                          ? 'ثبّت موعد رحلتك دون أي خصم مالي اليوم مع مراجعة وتنسيق مرن.'
                          : 'Hold your preferred dates with zero upfront charge today.'
                        : gw.name}
                  </p>
                </div>

                {/* Features List */}
                <div className="pt-3 my-3 border-t border-border/50 flex flex-col gap-2 text-xs text-foreground/80">
                  {isStripe ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span>{isArabic ? 'إصدار فاوتشر الحجز وتأكيد المقاعد فوراً' : 'Instant reservation voucher & confirmed seats'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span>{isArabic ? 'دعم Visa و Mastercard و American Express' : 'Supports Visa, Mastercard & Amex'}</span>
                      </div>
                    </>
                  ) : isBnpl ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{isArabic ? 'بدون أي دفع أو خصم بنكي مطلوب اليوم' : 'Zero payment required today'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{isArabic ? 'تنسيق جدول الرحلة والتفاصيل مع الكونسيرج' : 'Dedicated concierge review & travel coordination'}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Bottom Trust/Settlement Footnote */}
              <div className="pt-3 mt-1 border-t border-border/40 flex items-center gap-2 text-[11px] text-foreground/50">
                {isStripe ? (
                  <>
                    <LockClosedIcon className="w-3.5 h-3.5 text-secondary/80 shrink-0" />
                    <span>
                      {isArabic
                        ? 'معاملة مشفرة بنكياً 256-bit · عبر Stripe'
                        : '256-bit encrypted checkout · Powered by Stripe'}
                    </span>
                  </>
                ) : isBnpl ? (
                  <>
                    <CheckCircleMicroIcon className="w-3.5 h-3.5 text-accent/80 shrink-0" />
                    <span>
                      {isArabic
                        ? 'سداد مريح ومرن قبل موعد انطلاق الرحلة'
                        : 'Flexible settlement timeline prior to departure'}
                    </span>
                  </>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}


