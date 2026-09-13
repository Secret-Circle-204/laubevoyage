'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { checkBookingStatusAction } from '@/application/actions/booking-actions'
import { useLocale } from '@/providers'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'

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

export function CheckoutSuccessClient({
  transactionId,
  bookingNumber,
}: CheckoutSuccessClientProps) {
  const { locale } = useLocale()
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed' | 'timeout' | 'review'>('pending')
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
    const maxAttempts = 8 // ~80s total timeout with exponential delay

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

        if (res.success && res.status) {
          const currentStatus = res.status.toLowerCase()
          if (currentStatus === 'pending_admin_review') {
            setStatus('review')
            if (res.bookingNumber) {
              setConfirmedBookingNumber(res.bookingNumber)
            }
            isPollingRef.current = false
            return
          } else if (currentStatus === 'confirmed' || currentStatus === 'paid') {
            setStatus('confirmed')
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
              isPollingRef.current = false
              return
            }
          } else if (currentStatus === 'cancelled' || currentStatus === 'failed') {
            setStatus('failed')
            isPollingRef.current = false
            return
          }
        }
      } catch (err) {
        console.error('[CheckoutSuccessClient] Status check error:', err)
      }

      if (attempts >= maxAttempts) {
        setStatus((prev) => (prev === 'confirmed' ? 'confirmed' : 'timeout'))
        isPollingRef.current = false
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
  }, [transactionId, bookingNumber])

  return (
    <div className="py-16 sm:py-24 bg-background min-h-screen flex items-center justify-center text-foreground">
      <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
        <Card
          variant="elevated"
          padding="lg"
          className="text-center shadow-2xl border border-border/80 bg-card rounded-3xl space-y-6 p-6 sm:p-8"
        >
          {status === 'pending' && (
            <div className="space-y-6 py-6 animate-editorial-reveal">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {dict.get(locale, 'checkout.success.pendingBadge') || 'VAULT'}
                </span>
              </div>

              <div>
                <Badge variant="outline" size="md" className="mb-3 text-xs border-secondary/30 text-secondary bg-secondary/5 font-semibold">
                  {dict.get(locale, 'checkout.success.pendingBadge') || 'SETTLEMENT CHECKPOINT'}
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
          )}

          {status === 'confirmed' && (
            <div className="space-y-6 py-4 animate-editorial-reveal">
              <div className="w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary text-secondary flex items-center justify-center mx-auto shadow-lg shadow-secondary/10">
                <CheckIcon className="w-10 h-10" />
              </div>

              <div>
                <Badge variant="secondary" size="md" className="mb-2 text-xs border border-secondary/25 bg-secondary/10 text-secondary font-semibold">
                  {dict.get(locale, 'checkout.success.confirmedBadge') || 'RESERVATION SECURED'}
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-hornbill font-light text-foreground tracking-tight">
                  {dict.get(locale, 'checkout.success.confirmedTitle') || 'Journey Confirmed'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {dict.get(locale, 'checkout.success.confirmedDesc') ||
                    'Your reservation ledger is finalized and your travel dossier is confirmed.'}
                </p>
              </div>

              <div className="bg-card-elevated/70 p-5 rounded-2xl border border-border/70 text-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.bookingReference') || 'Booking Reference'}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-secondary">
                    #{confirmedBookingNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.status') || 'Status'}
                  </span>
                  <span className="text-xs font-bold text-secondary px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/25 uppercase">
                    {dict.get(locale, 'checkout.success.confirmedStatus') || 'Confirmed & Secured'}
                  </span>
                </div>
                {totalAmountDisplay && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs uppercase font-medium">
                      {dict.get(locale, 'checkout.success.totalSettled') || 'Total Settled'}
                    </span>
                    <span className="font-bold text-foreground">{totalAmountDisplay}</span>
                  </div>
                )}
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
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={
                    confirmedBookingNumber
                      ? `/booking/confirmation/${confirmedBookingNumber}`
                      : '/dashboard/bookings'
                  }
                  className="w-full"
                >
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md cursor-pointer py-3.5">
                    {dict.get(locale, 'checkout.success.accessTravelDossier') || 'Access Travel Dossier →'}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'review' && (
            <div className="space-y-6 py-4 animate-editorial-reveal">
              <div className="w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary text-secondary flex items-center justify-center mx-auto shadow-lg shadow-secondary/10">
                <ReviewIcon className="w-10 h-10" />
              </div>

              <div>
                <Badge variant="secondary" size="md" className="mb-2 text-xs border border-secondary/25 bg-secondary/10 text-secondary font-semibold">
                  {dict.get(locale, 'checkout.success.reviewBadge') || 'REQUEST SUBMITTED'}
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-hornbill font-light text-foreground tracking-tight">
                  {dict.get(locale, 'checkout.success.reviewTitle') || 'Awaiting Administrative Review'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {dict.get(locale, 'checkout.success.reviewDesc') ||
                    'Your reservation request has been received. Our concierge team is reviewing accommodation inventory and will confirm shortly.'}
                </p>
              </div>

              <div className="bg-card-elevated/70 p-5 rounded-2xl border border-border/70 text-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.bookingReference') || 'Booking Reference'}
                  </span>
                  <span dir="ltr" className="font-mono font-bold text-secondary">
                    #{confirmedBookingNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs uppercase font-medium">
                    {dict.get(locale, 'checkout.success.status') || 'Status'}
                  </span>
                  <span className="text-xs font-bold text-secondary px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/25 uppercase">
                    {dict.get(locale, 'checkout.success.pendingConciergeReview') || 'Pending Concierge Review'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard/bookings" className="w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md cursor-pointer py-3.5">
                    {dict.get(locale, 'checkout.success.viewInMemberVault') || 'View in Member Vault →'}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'timeout' && (
            <div className="space-y-6 py-4 animate-editorial-reveal">
              <div className="w-20 h-20 rounded-full bg-card-elevated border-2 border-border text-muted-foreground flex items-center justify-center mx-auto">
                <ReviewIcon className="w-8 h-8" />
              </div>

              <div>
                <Badge variant="outline" size="md" className="mb-2 text-xs border-border font-semibold">
                  {dict.get(locale, 'checkout.success.timeoutBadge') || 'PROCESSING IN VAULT'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground tracking-tight">
                  {dict.get(locale, 'checkout.success.timeoutTitle') || 'Settlement Verification in Progress'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {dict.get(locale, 'checkout.success.timeoutDesc') ||
                    'Your reservation is being confirmed with the booking vault. You can review your status anytime in your dashboard.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard/bookings" className="w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md cursor-pointer py-3.5">
                    {dict.get(locale, 'checkout.success.goToMemberVault') || 'Go to Member Vault →'}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-6 py-4 animate-editorial-reveal">
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                <FailedIcon className="w-8 h-8" />
              </div>

              <div>
                <Badge variant="error" size="md" className="mb-2 font-medium text-xs">
                  {dict.get(locale, 'checkout.success.failedBadge') || 'TRANSACTION UNCONFIRMED'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-hornbill font-light text-foreground tracking-tight">
                  {dict.get(locale, 'checkout.success.failedTitle') || 'Reservation Incomplete'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {dict.get(locale, 'checkout.success.failedDesc') ||
                    'We could not verify a successful transaction for this reservation session.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/experiences" className="w-full">
                  <Button variant="outline" size="lg" className="w-full font-bold cursor-pointer py-3.5">
                    {dict.get(locale, 'checkout.success.returnToExperiences') || 'Return to Experiences →'}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
