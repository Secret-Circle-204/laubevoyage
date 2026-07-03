import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { verifyWebhookSignature } from '@/lib/stripe'
import { sendEmail, getBookingConfirmationTemplate } from '@/services/email'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // ✅ SECURITY: Require signature header
    if (!signature) {
      console.error('⚠️ Webhook received without signature header')
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // ✅ SECURITY: Verify webhook signature using stripe.webhooks.constructEvent
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('⚠️ STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const event = verifyWebhookSignature(body, signature, webhookSecret)

    if (!event) {
      console.error('⚠️ Invalid webhook signature - possible fraud attempt')
      return NextResponse.json({ error: 'Invalid signature - request rejected' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // ✅ Handle checkout.session.completed - Payment successful
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId
      const userId = session.metadata?.userId

      if (bookingId) {
        const numericBookingId = Number(bookingId)

        // Fetch booking details for email
        const booking = await payload.findByID({
          collection: 'bookings',
          id: numericBookingId,
          depth: 2,
        })

        // Update booking status to confirmed
        await payload.update({
          collection: 'bookings',
          id: numericBookingId,
          data: {
            status: 'confirmed',
            notes: `✅ Payment Confirmed | Stripe Payment Intent: ${session.payment_intent} | Amount: $${((session.amount_total ?? 0) / 100).toFixed(2)}`,
          },
        })

        // Calculate points earned (with tier multiplier)
        const amountPaidDollars = (session.amount_total ?? 0) / 100
        const pointsEarned = Math.floor(amountPaidDollars / 10) // base: 1 point per $10

        // Award loyalty points to user AND update user's balance
        if (userId && pointsEarned > 0) {
          try {
            // استخدام الدالة المركزية التي تحدث النقاط + totalSpend + tier + history
            const { addPointsToUser } = await import('@/services/loyalty')
            await addPointsToUser(
              payload,
              Number(userId),
              pointsEarned,
              amountPaidDollars, // totalSpend to add
              numericBookingId,
            )
            console.log(`[Stripe Webhook] ✅ Awarded ${pointsEarned} points to user ${userId}`)
          } catch (e) {
            console.error('[Stripe Webhook] Failed to award loyalty points:', e)
          }
        }

        // ✅ POINTS ARE ALREADY HELD/DEDUCTED: No need to deduct again!
        // We do not deduct points here because it was already done in checkout/route.ts (as a HOLD)
        const pointsToRedeem = Number(session.metadata?.pointsToRedeem || 0)
        if (pointsToRedeem > 0 && userId) {
          console.log(
            `[Stripe Webhook] ℹ️ Points (${pointsToRedeem}) were already held/deducted during checkout initiation.`,
          )
        }

        // ✅ Send confirmation email to customer
        const customerEmail = session.customer_email || booking.contactEmail
        const packageData = typeof booking.package === 'object' ? booking.package : null
        const userData = typeof booking.user === 'object' ? booking.user : null

        if (customerEmail) {
          try {
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
            console.log(`[Stripe Webhook] ✉️ Confirmation email sent to ${customerEmail}`)
          } catch (emailError) {
            console.error('[Stripe Webhook] Failed to send confirmation email:', emailError)
          }

          // ✅ Also Notify Admin
          const adminEmail = process.env.FROM_EMAIL
          if (adminEmail) {
            try {
              await sendEmail({
                to: adminEmail,
                subject: `💰 Payment Success: ${packageData?.title || 'Package'} - $${booking.totalPrice?.toLocaleString()}`,
                html: `<h1>Payment Confirmed via Webhook</h1>
                       <p>Booking ID: #${bookingId}</p>
                       <p>Customer: ${userData?.name || customerEmail}</p>
                       <p>Total: $${booking.totalPrice?.toLocaleString()}</p>
                       <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/bookings/${bookingId}">View in Admin</a>`,
                fromType: 'reservation',
              })
            } catch (adminErr) {
              console.error('[Stripe Webhook] Admin notification failed:', adminErr)
            }
          }
        }

        console.log(`[Stripe Webhook] ✅ Booking ${bookingId} confirmed via payment`)
      }
    }

    // ✅ Handle checkout.session.expired - Hold expired, release booking
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId

      if (bookingId) {
        // ✅ RACE CONDITION FIX: Do not cancel or restore points if the booking is already confirmed
        const booking = await payload.findByID({
          collection: 'bookings',
          id: Number(bookingId),
          depth: 0,
        })

        if (booking.status === 'confirmed' || booking.status === 'completed') {
          console.log(
            `[Stripe Webhook] ⚠️ Received session.expired but Booking ${bookingId} is already confirmed. Ignoring.`,
          )
        } else {
          await payload.update({
            collection: 'bookings',
            id: Number(bookingId),
            data: {
              status: 'cancelled',
              notes: `❌ Payment session expired | Session ID: ${session.id}`,
            },
          })

          console.log(`[Stripe Webhook] ⏰ Booking ${bookingId} cancelled - session expired`)
        }
      }
    }

    // ✅ Handle payment_intent.payment_failed - Payment failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(
        `[Stripe Webhook] ❌ Payment failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message}`,
      )

      // Optionally: Send notification email to admin
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Webhook handler failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Disable body parsing for webhook route (Next.js App Router)
