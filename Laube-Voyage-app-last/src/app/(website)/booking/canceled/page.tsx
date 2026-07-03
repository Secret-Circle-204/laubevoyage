import Link from 'next/link'
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Package } from '@/payload-types'

interface PageProps {
  searchParams: Promise<{ bookingId?: string; reason?: string }>
}

export default async function BookingCanceledPage({ searchParams }: PageProps) {
  const { bookingId, reason } = await searchParams

  const payload = await getPayload({ config })

  // Fetch support details dynamically
  let phone = '+20 123 456 7890'
  let email = 'contact@laubevoyage.com'
  try {
    const companySettings = await payload.findGlobal({
      slug: 'company-settings',
    })
    if (companySettings) {
      phone = companySettings.phone || phone
      email = companySettings.email || email
    }
  } catch (e) {
    console.error('Failed to fetch company settings:', e)
  }

  let booking = null
  let packageData: Package | null = null

  if (bookingId) {
    try {
      booking = await payload.findByID({
        collection: 'bookings',
        id: bookingId,
        depth: 1,
      })
      packageData = typeof booking?.package === 'object' ? booking.package : null
    } catch (e) {
      console.error('Failed to fetch booking:', e)
    }
  }

  const reasonMessages: Record<string, string> = {
    card_declined: 'Your card was declined. Please try a different payment method.',
    expired: 'Your payment session expired. Please start the checkout again.',
    cancelled: 'You cancelled the payment. No charges were made.',
    default: 'The payment was not completed. No charges were made to your account.',
  }

  const displayReason = reasonMessages[reason || 'default'] || reasonMessages['default']

  return (
    <main className="min-h-screen bg-background dark:bg-dark-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Canceled Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-serif font-light text-foreground dark:text-dark-foreground mb-4">
          Payment Not Completed
        </h1>
        <p className="text-gray text-lg mb-8">{displayReason}</p>

        {/* Booking Info */}
        {booking && packageData && (
          <div className="bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20 p-6 mb-8 text-left">
            <h2 className="font-semibold text-foreground dark:text-dark-foreground mb-4">
              Your Reservation is Still Held
            </h2>
            <div className="flex justify-between items-center py-3 border-b border-gray/10">
              <span className="text-gray">Package</span>
              <span className="font-medium text-foreground dark:text-dark-foreground">
                {packageData.title}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray">Price</span>
              <span className="font-bold text-primary">
                ${booking.totalPrice?.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-4">
              ⏰ Your booking is held for 10 minutes. Complete payment to secure your reservation.
            </p>
          </div>
        )}

        {/* What to do next */}
        <div className="bg-gray/5 dark:bg-gray/10 border border-gray/10 p-6 mb-8">
          <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-3">
            What can you do?
          </h3>
          <ul className="text-sm text-gray space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              Try again with a different payment method
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              Check your card details and try again
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              Contact your bank if the issue persists
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {packageData && (
            <Link href={bookingId ? `/booking/pay?id=${bookingId}` : `/book?package=${packageData.id}`}>
              <button className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium flex items-center justify-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </Link>
          )}
          <Link href="/contact">
            <button className="px-8 py-3 border border-gray/20 hover:border-primary text-foreground dark:text-dark-foreground font-medium flex items-center justify-center gap-2 transition-colors">
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </button>
          </Link>
        </div>

        {/* Back to Home */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-gray hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Link>
        </div>

        {/* Support */}
        <p className="text-sm text-gray mt-8">
          Need help? Call us at{' '}
          <a href={`tel:${phone}`} className="text-primary hover:underline">
            {phone}
          </a>{' '}
          or email{' '}
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        </p>
      </div>
    </main>
  )
}
