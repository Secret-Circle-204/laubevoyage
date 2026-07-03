'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Booking, Package, Media } from '@/payload-types'

import { useRouter } from 'next/navigation'
import { confirmPayLaterAction } from '@/app/(website)/book/bookingActions'

interface PaymentClientProps {
  booking: Booking
}

export default function PaymentClient({ booking }: PaymentClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [payLaterStatus, setPayLaterStatus] = useState<'idle' | 'loading'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const packageData = typeof booking.package === 'object' ? (booking.package as Package) : null
  const heroImage = packageData?.heroImage as Media | null

  const initiatePayment = async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.contactEmail,
        }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Failed to create payment session')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Connection error. Please try again.')
    }
  }

  const handlePayLater = async () => {
    setPayLaterStatus('loading')
    try {
      const result = await confirmPayLaterAction(booking.id)
      if (result.success) {
        router.push('/dashboard/trips?msg=booking_received')
      } else {
        // Fallback redirect even if email fails, to not block the user
        router.push('/dashboard/trips')
      }
    } catch (e) {
      console.error('Pay later error:', e)
      router.push('/dashboard/trips')
    }
  }

  // Auto-scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen bg-background dark:bg-dark py-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-[#1a1718] rounded-3xl p-8 md:p-12 border border-gray/10 dark:border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark dark:text-white mb-3">
              Complete Your Payment
            </h1>
            <p className="text-gray dark:text-stone-400">
              Your journey is just one step away. Secure your booking now.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-gray/5 dark:bg-white/5 rounded-2xl p-6 mb-8">
            <div className="flex gap-6">
              {heroImage?.url && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={heroImage.url}
                    alt={packageData?.title || 'Package'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-accent font-bold mb-1">
                  Booking #{booking.id}
                </p>
                <h2 className="text-xl font-serif text-dark dark:text-white mb-2">
                  {packageData?.title || 'Travel Package'}
                </h2>
                <p className="text-sm text-gray dark:text-stone-400">
                  {booking.bookingDate
                    ? new Date(booking.bookingDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Date pending'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray/10 dark:border-white/10 flex items-center justify-between">
              <span className="text-lg font-medium text-dark dark:text-white">Total Amount</span>
              <span className="text-3xl font-serif font-bold text-accent">
                ${booking.totalPrice?.toLocaleString() || '0'}
              </span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-8">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">
              Your payment is secured with industry-standard 256-bit SSL encryption via Stripe.
            </p>
          </div>

          {/* Error Message */}
          {status === 'error' && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={initiatePayment}
              disabled={status === 'loading' || payLaterStatus === 'loading'}
              className="w-full py-5 bg-accent hover:bg-primary text-white font-bold text-sm tracking-widest uppercase rounded-full transition-all duration-300 shadow-xl flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay ${booking.totalPrice?.toLocaleString() || '0'} Securely
                </>
              )}
            </button>

            <button
              onClick={handlePayLater}
              disabled={status === 'loading' || payLaterStatus === 'loading'}
              className="w-full py-4 border border-gray/20 dark:border-white/20 text-gray dark:text-stone-400 hover:border-accent hover:text-accent text-sm tracking-widest uppercase rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {payLaterStatus === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Later from Dashboard'
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-gray/60 dark:text-stone-500 mt-8">
            By proceeding, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-accent">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-accent">
              Privacy Policy
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  )
}
