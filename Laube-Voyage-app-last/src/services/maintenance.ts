import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * خدمة صيانة الحجوزات - تقوم بتحديث حالات الحجوزات تلقائياً
 * Booking Maintenance Service - Automatically updates booking statuses
 */
export async function processBookingLifecycle() {
  const payload = await getPayload({ config })
  const now = new Date()

  // تاريخ اليوم بدون وقت للمقارنة الدقيقة
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // تاريخ "بعد يومين" لإلغاء الحجوزات المعلقة القريبة
  const twoDaysFromNow = new Date(today)
  twoDaysFromNow.setDate(today.getDate() + 2)

  console.log(`[Maintenance] Start lifecycle process at ${now.toISOString()}`)

  try {
    // 1. تحديث الحجوزات المؤكدة التي انتهت رحلتها إلى "مكتملة"
    // Confirm -> Completed if trip date passed
    const confirmedToComplete = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { status: { equals: 'confirmed' } },
          { bookingDate: { less_than: today.toISOString() } },
        ],
      },
      limit: 100, // معالجة دفعات لتجنب الضغط
    })

    await Promise.all(
      confirmedToComplete.docs.map(async (booking) => {
        await payload.update({
          collection: 'bookings',
          id: booking.id,
          data: {
            status: 'completed',
            notes:
              `${booking.notes || ''}\n[System] Marked as completed because trip date passed.`.trim(),
          },
        })
        console.log(`[Maintenance] Booking #${booking.id} set to COMPLETED`)
      })
    )

    // 2. إلغاء الحجوزات "المعلقة" التي اقترب موعدها ولم يتم دفعها
    // Pending -> Cancelled if trip date is within 2 days
    const pendingToCancel = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { bookingDate: { less_than_equal: twoDaysFromNow.toISOString() } },
        ],
      },
      limit: 100,
    })

    await Promise.all(
      pendingToCancel.docs.map(async (booking) => {
        await payload.update({
          collection: 'bookings',
          id: booking.id,
          data: {
            status: 'cancelled',
            notes:
              `${booking.notes || ''}\n[System] Cancelled due to non-payment close to trip date.`.trim(),
          },
        })
        console.log(`[Maintenance] Booking #${booking.id} set to CANCELLED (near date)`)
      })
    )

    return {
      completed: confirmedToComplete.totalDocs,
      cancelled: pendingToCancel.totalDocs,
      success: true,
    }
  } catch (error) {
    console.error('[Maintenance Error]:', error)
    return { success: false, error }
  }
}
