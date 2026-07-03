'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import {
  sendEmail,
  getPendingBookingTemplate,
  getAdminBookingNotificationTemplate,
} from '@/services/email'
import { getLoyaltyConfig, getDiscountForPoints } from '@/services/loyaltyConfig'
import type { User } from '@/payload-types'

interface BookingFormData {
  packageId: string | number
  contactEmail: string
  contactPhone: string
  bookingDate: string
  travelers: {
    fullName: string
    type: 'adult' | 'infant'
    passportNumber?: string
    specialRequests?: string
  }[]
  selectedExcursions?: (string | number)[]
  totalPrice: number
  pointsToRedeem?: number // نقاط الولاء المراد استبدالها
}

export async function createBookingAction(formData: BookingFormData) {
  const payload = await getPayload({ config })
  const headerList = await headers()

  // Get current user session
  const { user } = await payload.auth({ headers: headerList })

  if (!user) {
    return { success: false, error: 'You must be logged in to make a reservation.' }
  }

  const ensureNumber = (val: string | number): number =>
    typeof val === 'string' && /^\d+$/.test(val) ? parseInt(val, 10) : (val as number)

  try {
    const pointsToRedeem = formData.pointsToRedeem || 0
    let discountAmount = 0

    if (pointsToRedeem > 0) {
      // Load redemption tiers from admin settings
      const loyaltyConfig = await getLoyaltyConfig()
      discountAmount = getDiscountForPoints(pointsToRedeem, loyaltyConfig)

      if (discountAmount === 0) {
        return { success: false, error: 'Invalid points redemption amount.' }
      }
      
      const userPoints = (user as User).loyaltyPoints || 0
      if (userPoints < pointsToRedeem) {
        return { success: false, error: 'Insufficient loyalty points.' }
      }
    }

    // Create booking (Record only, no emails yet)
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        user: ensureNumber(user.id),
        package: ensureNumber(formData.packageId),
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        bookingDate: formData.bookingDate,
        travelersList: formData.travelers,
        selectedExcursions: Array.isArray(formData.selectedExcursions)
          ? formData.selectedExcursions.map(ensureNumber)
          : formData.selectedExcursions,
        totalPrice: formData.totalPrice,
        pointsRedeemed: pointsToRedeem,
        discountAmount: discountAmount,
        status: 'pending',
      },
    })

    // Create immediate HOLD for the points if successfully created booking
    if (pointsToRedeem > 0) {
      await payload.create({
        collection: 'loyalty-points',
        data: {
          user: user.id,
          points: -pointsToRedeem,
          type: 'admin',
          reason: `[HOLD] Points pending for Booking #${booking.id} - ${pointsToRedeem} pts`,
        },
        context: { skipPointsLogging: true },
      })
      console.log(`[BookingAction] 🔒 HOLD: Deducted ${pointsToRedeem} points from user ${user.id} for Booking ${booking.id}`)
    }

    return {
      success: true,
      bookingId: booking.id,
      pointsToRedeem: formData.pointsToRedeem || 0,
    }
  } catch (error: unknown) {
    console.error('[BookingAction] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation.'
    return { success: false, error: errorMessage }
  }
}

/**
 * Triggers emails for "Pay Later" flow
 */
export async function confirmPayLaterAction(bookingId: string | number) {
  const payload = await getPayload({ config })
  const headerList = await headers()

  const { user } = await payload.auth({ headers: headerList })
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const booking = await payload.findByID({
      collection: 'bookings',
      id: bookingId,
      depth: 2,
    })

    const packageData = typeof booking.package === 'object' ? booking.package : null
    const formattedDate = booking.bookingDate
      ? new Date(booking.bookingDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'To be confirmed'

    // 1. Send "Received" email to customer
    await sendEmail({
      to: booking.contactEmail,
      subject: `📋 Booking Received - ${packageData?.title || 'Your Journey'}`,
      html: getPendingBookingTemplate({
        name: user.name || 'Valued Traveler',
        packageTitle: packageData?.title || 'Travel Package',
        date: formattedDate,
        totalPrice: booking.totalPrice || 0,
        bookingId: booking.id,
      }),
      fromType: 'reservation',
    })

    // 2. Send notification to admin
    const adminEmail = process.env.FROM_EMAIL
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `🆕 New "Pay Later" Booking: ${packageData?.title || 'Package'}`,
        html: getAdminBookingNotificationTemplate({
          customerName: user.name || booking.contactEmail,
          customerEmail: booking.contactEmail,
          customerPhone: booking.contactPhone,
          packageTitle: packageData?.title || 'Travel Package',
          date: formattedDate,
          totalPrice: booking.totalPrice || 0,
          bookingId: booking.id,
          paymentStatus: 'pending',
        }),
        fromType: 'reservation',
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('[PayLaterAction] Error:', error)
    return { success: false, error: 'Failed to process notifications' }
  }
}
