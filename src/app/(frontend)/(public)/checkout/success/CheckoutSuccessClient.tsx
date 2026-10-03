'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { checkBookingStatusAction } from '@/application/actions/booking-actions'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import {
  CustomerPaymentTruth,
  CustomerPaymentTruthPresenter,
} from '@/application/payment/customer-payment-truth'

const dict = new JsonTranslationDictionary()

interface CheckoutSuccessClientProps {
  transactionId?: string
  bookingNumber?: string
}

function CheckIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function ReviewIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function FailedIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ClockIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function CheckoutSuccessClient({
  transactionId,
  bookingNumber,
}: CheckoutSuccessClientProps) {
  const { locale } = useLocale()
  const [truth, setTruth] = useState<CustomerPaymentTruth | null>(null)
  const [_pollCount, setPollCount] = useState<number>(0)
  const [confirmedBookingNumber, setConfirmedBookingNumber] = useState<string | undefined>(
    bookingNumber,
  )
  const [earnedPoints, setEarnedPoints] = useState<number | undefined>(undefined)
  const [totalAmountDisplay, setTotalAmountDisplay] = useState<string | undefined>(undefined)
  const isPollingRef = useRef<boolean>(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('laube_chk_key_')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key))
      } catch (err) {
        console.error('[CheckoutSuccessClient] Failed clearing checkout keys:', err)
      }
    }
  }, [])

  useEffect(() => {
    isPollingRef.current = true
    let attempts = 0
    const maxAttempts = 8

    const getNextDelay = (attemptCount: number): number => {
      const delay = Math.pow(2, attemptCount - 1) * 1000
      return Math.min(delay, 16000)
    }

    const pollStatus = async () => {
      if (!isPollingRef.current) return

      attempts += 1
      setPollCount(attempts)

      try {
        const res = await checkBookingStatusAction({
          transactionId,
          bookingNumber,
        })

        if (res.success) {
          if (res.bookingNumber) {
            setConfirmedBookingNumber(res.bookingNumber)
          }
          if (res.formattedTotalPrice) {
            setTotalAmountDisplay(res.formattedTotalPrice)
          } else if (res.pricingSnapshot) {
            const amountStr = res.pricingSnapshot.displayAmount
              ? `${res.pricingSnapshot.displayCurrency || '$'}${res.pricingSnapshot.displayAmount}`
              : `${res.pricingSnapshot.totalAmountEGP} EGP`
            setTotalAmountDisplay(amountStr)
          }

          if (typeof res.earnedPoints === 'number') {
            setEarnedPoints(res.earnedPoints)
          }

          const currentTruth: CustomerPaymentTruth =
            res.customerTruth ||
            CustomerPaymentTruthPresenter.resolve({
              bookingStatus: res.status || 'unknown',
              paymentStatus: res.paymentStatus || 'unknown',
              providerStatus: res.providerStatus,
              isHoldExpired: res.isHoldExpired,
              bookingNumber: res.bookingNumber,
              transactionId,
              checkoutUrl: res.checkoutUrl,
            })

          setTruth(currentTruth)

          // Immediately stop polling on terminal states (Confirmed, Cancelled, Expired, Failed, Late Payment, Review)
          if (currentTruth.isTerminal) {
            isPollingRef.current = false
            return
          }
        }
      } catch (err) {
        console.error('[CheckoutSuccessClient] Status check error:', err)
      }

      if (attempts >= maxAttempts) {
        isPollingRef.current = false
        setTruth((prev) => {
          if (prev && prev.semanticState === 'CONFIRMED') {
            return prev
          }
          // Never invent false settlement. State truthful unconfirmed state without suggesting duplicate payment.
          return CustomerPaymentTruthPresenter.resolve({
            bookingStatus: 'unknown',
            paymentStatus: 'unknown',
            providerStatus: 'unknown',
            bookingNumber: confirmedBookingNumber,
            transactionId,
          })
        })
        return
      }

      if (isPollingRef.current) {
        const nextDelay = getNextDelay(attempts)
        setTimeout(pollStatus, nextDelay)
      }
    }

    pollStatus()

    return () => {
      isPollingRef.current = false
    }
  }, [transactionId, bookingNumber, confirmedBookingNumber])

  // Helper to render appropriate status icon
  const renderStatusIcon = (semanticState: string) => {
    switch (semanticState) {
      case 'CONFIRMED':
        return (
          <div className="w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary text-secondary flex items-center justify-center mx-auto shadow-lg shadow-secondary/10">
            <CheckIcon className="w-10 h-10" />
          </div>
        )
      case 'PENDING_ADMIN_REVIEW':
      case 'LATE_PAYMENT_UNDER_REVIEW':
        return (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <ReviewIcon className="w-10 h-10" />
          </div>
        )
      case 'PAYMENT_RECEIVED':
        return (
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
            <CheckIcon className="w-8 h-8 text-secondary" />
          </div>
        )
      case 'PAYMENT_REQUIRED':
      case 'SESSION_EXPIRED':
        return (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center mx-auto">
            <ClockIcon className="w-9 h-9" />
          </div>
        )
      case 'PAYMENT_FAILED':
      case 'BOOKING_EXPIRED':
      case 'CANCELLED':
        return (
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <FailedIcon className="w-8 h-8" />
          </div>
        )
      default:
        return (
          <div className="w-20 h-20 rounded-full bg-card-elevated border-2 border-border text-muted-foreground flex items-center justify-center mx-auto">
            <ReviewIcon className="w-8 h-8" />
          </div>
        )
    }
  }

  // Render initial synchronization loader before first poll resolves
  if (!truth) {
    return (
      <div className="py-16 sm:py-24 bg-background min-h-screen flex items-center justify-center text-foreground">
        <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
          <Card
            variant="elevated"
            padding="lg"
            className="text-center shadow-2xl border border-border/80 bg-card rounded-3xl space-y-6 p-6 sm:p-8"
          >
            <div className="space-y-6 py-6 animate-editorial-reveal">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {dict.get(locale, 'checkout.success.pendingBadge') || 'VAULT'}
                </span>
              </div>

              <div>
                <Badge variant="outline" size="md" className="mb-3 text-xs border-secondary/30 text-secondary bg-secondary/5 font-semibold">
                  {dict.get(locale, 'checkout.success.checkpointBadge') || 'SETTLEMENT CHECKPOINT'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground tracking-tight">
                  {dict.get(locale, 'checkout.success.verifyingTitle') || 'Verifying Reservation'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {dict.get(locale, 'checkout.success.verifyingDesc') ||
                    'Transaction received. Securing your itinerary ledger and credentials...'}
                </p>
              </div>

              <div className="bg-card-elevated p-4 rounded-2xl border border-border/80 text-xs text-muted-foreground flex items-center justify-between font-medium">
                <span>
                  {dict.get(locale, 'checkout.success.refLabel') || 'Ref:'}{' '}
                  <span dir="ltr" className="font-mono font-semibold text-foreground">
                    {confirmedBookingNumber || transactionId || 'LBV-VAULT'}
                  </span>
                </span>
                <span className="text-secondary font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                  {dict.get(locale, 'checkout.success.synchronizing') || 'Synchronizing...'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const badgeText = dict.get(locale, truth.badgeKey) || truth.badgeFallback
  const titleText = dict.get(locale, truth.titleKey) || truth.titleFallback
  const descText = dict.get(locale, truth.descKey) || truth.descFallback
  const primaryActionLabel = dict.get(locale, truth.primaryAction.labelKey) || truth.primaryAction.labelFallback
  const secondaryActionLabel =
    truth.secondaryAction &&
    (dict.get(locale, truth.secondaryAction.labelKey) || truth.secondaryAction.labelFallback)

  const isConfirmed = truth.semanticState === 'CONFIRMED'

  return (
    <div className="py-16 sm:py-24 bg-background min-h-screen flex items-center justify-center text-foreground">
      <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
        <Card
          variant="elevated"
          padding="lg"
          className="text-center shadow-2xl border border-border/80 bg-card rounded-3xl space-y-6 p-6 sm:p-8"
        >
          <div className="space-y-6 py-4 animate-editorial-reveal">
            {renderStatusIcon(truth.semanticState)}

            <div>
              <Badge
                variant={truth.badgeVariant}
                size="md"
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
              >
                {badgeText}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground tracking-tight">
                {titleText}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {descText}
              </p>
            </div>

            {/* Structured Itinerary / Booking Reference Specs */}
            <div className="bg-card-elevated/70 p-5 rounded-2xl border border-border/70 text-sm space-y-3 text-start">
              {confirmedBookingNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.bookingReference') || 'Booking Reference'}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-secondary">
                    #{confirmedBookingNumber}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs uppercase font-medium">
                  {dict.get(locale, 'checkout.success.status') || 'Lifecycle Status'}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/25 uppercase text-secondary">
                  {badgeText}
                </span>
              </div>

              {totalAmountDisplay && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.totalAmount') || 'Total Value'}
                  </span>
                  <span className="font-bold text-foreground">{totalAmountDisplay}</span>
                </div>
              )}

              {isConfirmed && (
                <div className="flex justify-between border-t border-border/60 pt-3 items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.loyaltyCreditAccrued') || 'Loyalty Credit Accrued'}
                  </span>
                  {typeof earnedPoints === 'number' ? (
                    <span dir="ltr" className="font-bold text-secondary">
                      +{earnedPoints.toLocaleString()} {dict.get(locale, 'checkout.success.pointsUnit') || 'Points'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
                      {dict.get(locale, 'checkout.success.accruing') || 'Accruing to account...'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons Matrix */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {truth.primaryAction.type === 'checkout' && truth.primaryAction.href ? (
                <a href={truth.primaryAction.href} className="w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md cursor-pointer py-3.5">
                    {primaryActionLabel}
                  </Button>
                </a>
              ) : truth.primaryAction.href ? (
                <Link href={truth.primaryAction.href} className="w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md cursor-pointer py-3.5">
                    {primaryActionLabel}
                  </Button>
                </Link>
              ) : null}

              {truth.secondaryAction && (
                <Link href={truth.secondaryAction.href} className="w-full">
                  <Button variant="outline" size="lg" className="w-full font-bold cursor-pointer py-3.5">
                    {secondaryActionLabel}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
