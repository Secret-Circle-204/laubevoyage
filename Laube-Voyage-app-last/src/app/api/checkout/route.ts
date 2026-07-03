import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createCheckoutSession, stripe } from '@/lib/stripe'
import type { User } from '@/payload-types'

// نظام تحويل النقاط للخصومات - مطابق للـ Frontend
const REDEMPTION_TIERS: Record<number, number> = {
  500: 25,
  1000: 55,
  2000: 120,
  5000: 350,
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Fetch the booking safely as the requesting user
    const booking = await payload.findByID({
      collection: 'bookings',
      id: bookingId,
      depth: 1,
      user,
      overrideAccess: false,
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // ✅ IDEMPOTENCY CHECK: Prevent duplicate payments
    if (booking.status === 'confirmed') {
      return NextResponse.json({ error: 'This booking has already been paid' }, { status: 400 })
    }

    // ✅ TEMPORARY HOLD: Set booking to pending-payment with expiry
    const holdExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: {
        status: 'pending',
        notes: `Payment initiated at ${new Date().toISOString()} | Hold expires: ${holdExpiry.toISOString()}`,
      },
      user,
      overrideAccess: true, // ✅ MUST BE TRUE: User cannot normally update a booking after creation
    })

    // Calculate final price
    let finalPrice = booking.totalPrice
    let stripeCouponId: string | null = null
    const pointsToRedeem = booking.pointsRedeemed || 0
    let discountApplied = booking.discountAmount || 0

    // ✅ CREATE STRIPE COUPON IF POINTS WERE REDEEMED
    if (pointsToRedeem > 0 && discountApplied > 0) {
      // 1. إنشاء كوبون Stripe لحظي (مرة واحدة فقط)
      try {
        const coupon = await stripe.coupons.create({
          amount_off: Math.round(discountApplied * 100), // تحويل للسنتات
          currency: 'usd',
          duration: 'once', // استخدام مرة واحدة فقط
          name: `Loyalty Points Redemption (${pointsToRedeem} pts)`,
          metadata: {
            userId: String(user.id),
            bookingId: String(bookingId),
            pointsRedeemed: String(pointsToRedeem),
          },
        })
        stripeCouponId = coupon.id
        console.log(
          `[Checkout] ✅ Created Stripe coupon ${coupon.id} for ${discountApplied} discount`,
        )
      } catch (couponError) {
        console.error('[Checkout] Failed to create Stripe coupon:', couponError)
        // في حالة فشل إنشاء الكوبون، نستمر بدون خصم
        discountApplied = 0
        finalPrice = booking.totalPrice + (booking.discountAmount || 0) // Revert backend discount if stripe failed
      }
    }

    // Get package title
    const packageData = typeof booking.package === 'object' ? booking.package : null
    const packageTitle = packageData?.title || "L'Aube Voyage Booking"

    // Build URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const successUrl = `${origin}/booking/success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/booking/canceled?bookingId=${bookingId}`

    // ✅ SMART EMAIL FALLBACK: User Session > Request Body > Booking Record
    const customerEmail = user?.email || body.email || booking.contactEmail

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required. Please provide an email or sign in.' },
        { status: 400 },
      )
    }

    // ✅ ENHANCED SESSION: Create checkout with coupon if applicable
    const sessionConfig: Parameters<typeof createCheckoutSession>[0] = {
      bookingId: String(bookingId),
      packageTitle,
      totalPrice: stripeCouponId ? booking.totalPrice : finalPrice, // استخدام السعر الأصلي إذا هناك كوبون
      customerEmail: String(customerEmail),
      successUrl,
      cancelUrl,
      // Enhanced metadata for Stripe Dashboard
      metadata: {
        bookingId: String(bookingId),
        userId: String(user.id),
        userName: user.name || 'Guest',
        packageId: packageData?.id ? String(packageData.id) : '',
        packageTitle: packageTitle,
        originalPrice: String(booking.totalPrice),
        discountApplied: String(discountApplied),
        pointsToRedeem: String(pointsToRedeem || 0), // ⚠️ مهم للـ Webhook
        travelDate: booking.bookingDate || '',
        holdExpiry: holdExpiry.toISOString(),
      },
      // Add coupon if created
      ...(stripeCouponId && { couponId: stripeCouponId }),
    }

    const session = await createCheckoutSession(sessionConfig)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      holdExpiry: holdExpiry.toISOString(),
      discount: discountApplied,
    })
  } catch (error: unknown) {
    console.error('Checkout error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
