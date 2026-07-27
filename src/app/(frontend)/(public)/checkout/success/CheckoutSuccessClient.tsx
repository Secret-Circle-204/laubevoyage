'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { checkBookingStatusAction } from '@/application/actions/booking-actions'

interface CheckoutSuccessClientProps {
  transactionId?: string
  bookingNumber?: string
}

export function CheckoutSuccessClient({
  transactionId,
  bookingNumber,
}: CheckoutSuccessClientProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed' | 'timeout'>('pending')
  const [pollCount, setPollCount] = useState<number>(0)
  const [confirmedBookingNumber, setConfirmedBookingNumber] = useState<string | undefined>(
    bookingNumber,
  )
  const isPollingRef = useRef<boolean>(true)

  useEffect(() => {
    isPollingRef.current = true
    let attempts = 0
    const maxAttempts = 30 // 30 attempts * 2 seconds = 60s timeout limit

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
          if (currentStatus === 'confirmed' || currentStatus === 'paid') {
            setStatus('confirmed')
            if (res.bookingNumber) {
              setConfirmedBookingNumber(res.bookingNumber)
            }
            isPollingRef.current = false
            return
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
        setStatus('timeout')
        isPollingRef.current = false
        return
      }

      if (isPollingRef.current) {
        setTimeout(pollStatus, 2000)
      }
    }

    // Initial check immediately, then interval
    pollStatus()

    return () => {
      isPollingRef.current = false
    }
  }, [transactionId, bookingNumber])

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto px-4 sm:px-6">
        <Card
          variant="elevated"
          padding="lg"
          className="text-center shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6"
        >
          {status === 'pending' && (
            <div className="space-y-6 py-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#00aeef]/20 border-t-[#00aeef] animate-spin" />
                <span className="text-2xl">💳</span>
              </div>

              <div>
                <Badge variant="accent" size="md" className="mb-3 animate-pulse">
                  Payment Gateway Checkpoint
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Verifying Payment Status
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Payment received. Waiting for payment webhook confirmation...
                </p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Ref: {confirmedBookingNumber || transactionId || 'LBV-PAYMENT'}</span>
                <span className="text-[#00aeef] font-bold">Polling check #{pollCount}</span>
              </div>
            </div>
          )}

          {status === 'confirmed' && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto text-4xl shadow-lg shadow-emerald-500/20">
                ✓
              </div>

              <div>
                <Badge variant="success" size="md" className="mb-2">
                  PAYMENT CONFIRMED
                </Badge>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Booking Confirmed!
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Your transaction was processed successfully and your reservation is confirmed.
                </p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#00aeef]">
                    #{confirmedBookingNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-500 uppercase">Confirmed & Paid</span>
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
                  <Button variant="accent" size="lg" className="w-full font-bold">
                    View Booking Voucher →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'timeout' && (
            <div className="space-y-6 py-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-500 flex items-center justify-center mx-auto text-3xl">
                ⏳
              </div>

              <div>
                <Badge variant="warning" size="md" className="mb-2">
                  PROCESSING IN BACKGROUND
                </Badge>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Payment Processing
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Your payment was received. Confirmation webhook processing is taking longer than expected. You can check your booking status anytime in your dashboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard/bookings" className="w-full">
                  <Button variant="primary" size="lg" className="w-full">
                    Go to Customer Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-6 py-4">
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 text-rose-500 flex items-center justify-center mx-auto text-3xl">
                ✕
              </div>

              <div>
                <Badge variant="error" size="md" className="mb-2">
                  PAYMENT UNCONFIRMED
                </Badge>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Payment Failed or Cancelled
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  We could not verify a successful transaction for this reservation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/experiences" className="w-full">
                  <Button variant="outline" size="lg" className="w-full">
                    Return to Experiences
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
