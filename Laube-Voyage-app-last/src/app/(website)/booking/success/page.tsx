import Link from 'next/link'
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Booking, Package, User } from '@/payload-types'
import { stripe } from '@/lib/stripe'
import { sendEmail, getBookingConfirmationTemplate } from '@/services/email'

interface PageProps {
  searchParams: Promise<{ bookingId?: string; session_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const { bookingId, session_id } = await searchParams

  let booking: Booking | null = null
  let packageData: Package | null = null
  let _isPaymentVerified = false

  const payload = await getPayload({ config })

  // Fetch support details dynamically
  let phone = '+20 123 456 7890'
  let supportEmail = 'reservation@laubevoyage.com'
  try {
    const companySettings = await payload.findGlobal({
      slug: 'company-settings',
    })
    if (companySettings) {
      phone = companySettings.phone || phone
      supportEmail = companySettings.reservationMail?.email || companySettings.email || supportEmail
    }
  } catch (e) {
    console.error('Failed to fetch company settings:', e)
  }

  if (bookingId) {
    try {
      booking = (await payload.findByID({
        collection: 'bookings',
        id: bookingId,
        depth: 2,
      })) as Booking

      packageData = typeof booking?.package === 'object' ? booking.package : null

      // ✅ Fallback Verification: If session_id is present and status is still pending
      if (session_id && booking.status === 'pending') {
        const session = await stripe.checkout.sessions.retrieve(session_id)

        if (session.payment_status === 'paid') {
          // Update status immediately (Webhook might still hit later, but this is immediate for the UI)
          await payload.update({
            collection: 'bookings',
            id: bookingId,
            data: {
              status: 'confirmed',
              notes:
                (booking.notes || '') + `\n✅ Verified via success page | Session: ${session_id}`,
            },
          })

          // Re-fetch to get updated status
          booking.status = 'confirmed'
          _isPaymentVerified = true

          // Trigger confirmation email if it hasn't been sent yet
          // We can check the notes or just send it (idempotency is better handled via a flag, but this works for now)
          const customerEmail = session.customer_email || booking.contactEmail
          const userData = typeof booking.user === 'object' ? (booking.user as User) : null
          const pointsEarned = Math.floor((session.amount_total ?? 0) / 1000)

          if (customerEmail) {
            await sendEmail({
              to: customerEmail,
              subject: `🎉 Booking Confirmed - ${packageData?.title || 'Your Journey'}`,
              html: getBookingConfirmationTemplate({
                name: userData?.name || 'Valued Traveler',
                packageTitle: packageData?.title || 'Your Travel Package',
                date: booking.bookingDate
                  ? new Date(booking.bookingDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'To be confirmed',
                totalPrice: booking.totalPrice || 0,
                pointsEarned: pointsEarned,
              }),
              fromType: 'reservation',
            })

            // ✅ Also Notify Admin
            const adminEmail = process.env.FROM_EMAIL
            if (adminEmail) {
              await sendEmail({
                to: adminEmail,
                subject: `💰 Payment Success: ${packageData?.title || 'Package'} - $${booking.totalPrice?.toLocaleString()}`,
                html: `<h1>Payment Confirmed</h1>
                       <p>Booking ID: #${bookingId}</p>
                       <p>Customer: ${userData?.name || customerEmail}</p>
                       <p>Total: $${booking.totalPrice?.toLocaleString()}</p>
                       <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/bookings/${bookingId}">View in Admin</a>`,
                fromType: 'reservation',
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to process booking success:', e)
    }
  }

  return (
    <main className="min-h-screen bg-background dark:bg-dark-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-serif font-light text-foreground dark:text-dark-foreground mb-4">
          {booking?.status === 'confirmed' ? 'Payment Successful!' : 'Booking Received!'}
        </h1>
        <p className="text-gray text-lg mb-8">
          {booking?.status === 'confirmed'
            ? 'Thank you for your payment. Your journey is now fully confirmed.'
            : "Thank you for choosing L'Aube Voyage. We are processing your request."}
        </p>

        {/* Booking Details */}
        {booking && (
          <div className="bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20 p-8 mb-8 text-left">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-foreground dark:text-dark-foreground">
                Booking Details
              </h2>
              <span
                className={`px-4 py-1 text-xs font-bold uppercase tracking-widest ${
                  booking.status === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                {booking.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray/10">
                <span className="text-gray">Package</span>
                <span className="font-medium text-foreground dark:text-dark-foreground">
                  {packageData?.title || 'Premium Package'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray/10">
                <span className="text-gray">Booking Reference</span>
                <span className="font-mono font-bold text-primary">
                  #{String(bookingId).slice(-8).toUpperCase()}
                </span>
              </div>

              {booking.bookingDate && (
                <div className="flex justify-between items-center py-3 border-b border-gray/10">
                  <span className="text-gray flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Travel Date
                  </span>
                  <span className="font-medium text-foreground dark:text-dark-foreground">
                    {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-3">
                <span className="text-gray">
                  Total {booking.status === 'confirmed' ? 'Paid' : 'Amount'}
                </span>
                <span
                  className={`text-2xl font-serif font-bold ${booking.status === 'confirmed' ? 'text-emerald-500' : 'text-primary'}`}
                >
                  ${booking.totalPrice?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-6 mb-8">
          <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-3 text-left pl-2">
            What happens next?
          </h3>
          <ul className="text-sm text-gray space-y-4 text-left">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="font-medium text-dark dark:text-white">Email Confirmation</p>
                <p className="text-xs">
                  You&apos;ll receive an automated confirmation email with your booking details.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="font-medium text-dark dark:text-white">Concierge Connection</p>
                <p className="text-xs">
                  One of our specialist travel designers will contact you within 24 hours to
                  finalize details.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                3
              </span>
              <div>
                <p className="font-medium text-dark dark:text-white">Final Itinerary</p>
                <p className="text-xs">
                  Your final travel pack and digital itinerary will be sent 7-14 days before
                  departure.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/trips">
            <button className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium flex items-center justify-center gap-2 transition-colors">
              Go to My Trips
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/">
            <button className="px-8 py-3 border border-gray/20 hover:border-primary text-foreground dark:text-dark-foreground font-medium transition-colors">
              Return Home
            </button>
          </Link>
        </div>

        {/* Support */}
        <p className="text-sm text-gray mt-8">
          Need immediate assistance? Contact us at{' '}
          <a href={`tel:${phone}`} className="text-primary hover:underline">
            {phone}
          </a>{' '}
          or email{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </main>
  )
}
