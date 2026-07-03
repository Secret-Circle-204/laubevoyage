'use client'

import { useState } from 'react'
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react'

interface PaymentButtonProps {
  bookingId: string
  totalPrice: number
  discountCode?: string
  onError?: (error: string) => void
}

export function PaymentButton({
  bookingId,
  totalPrice,
  discountCode,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    setLoading(true)

    try {
      // Create checkout session
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, discountCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      // Redirect to Stripe Checkout using server-provided URL
      if (data.url) {
        window.location.href = data.url
      } else if (data.sessionId) {
        // Fallback if URL is missing (should not happen with new Stripe API)
        console.error(
          'No checkout URL returned, but sessionId exists. Stripe Client SDK redirection is disabled.',
        )
        throw new Error('Unable to redirect to payment provider.')
      }
    } catch (error: unknown) {
      console.error('Payment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      onError?.(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ${totalPrice.toLocaleString()}
          </>
        )}
      </button>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>SSL Secured</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
          </svg>
          <span>Stripe Payments</span>
        </div>
      </div>
    </div>
  )
}
