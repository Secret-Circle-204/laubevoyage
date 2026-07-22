import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingCancelledEvent, BookingExpiredEvent } from '../booking-events'
import { NotificationQueue } from '../../notification/queue'
import { NotificationChannel, NotificationTemplate } from '@/types'

/**
 * Notification Event Subscriber
 * Listens to domain events and enqueues jobs into NotificationQueue without blocking caller.
 */
export function registerNotificationSubscriber(): void {
  const eventBus = EventBus.getInstance()
  const queue = NotificationQueue.getInstance()

  // 1. Handle Booking Confirmation
  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', (event) => {
    const primaryTraveler = event.booking.travelers[0]
    if (!primaryTraveler?.email) return

    queue.enqueue({
      recipient: primaryTraveler.email,
      channel: NotificationChannel.EMAIL,
      template: NotificationTemplate.BOOKING_CONFIRMED,
      payload: {
        bookingNumber: event.booking.bookingNumber,
        totalAmountEGP: event.booking.pricingSnapshot.totalAmountEGP,
        startDate: event.booking.startDate,
      },
    })
  })

  // 2. Handle Booking Cancellation
  eventBus.subscribe<BookingCancelledEvent>('BOOKING_CANCELLED', (event) => {
    const primaryTraveler = event.booking.travelers[0]
    if (!primaryTraveler?.email) return

    queue.enqueue({
      recipient: primaryTraveler.email,
      channel: NotificationChannel.EMAIL,
      template: NotificationTemplate.BOOKING_CANCELLED,
      payload: {
        bookingNumber: event.booking.bookingNumber,
        reason: event.reason,
      },
    })
  })

  // 3. Handle Booking Expiry
  eventBus.subscribe<BookingExpiredEvent>('BOOKING_EXPIRED', (event) => {
    const primaryTraveler = event.booking.travelers[0]
    if (!primaryTraveler?.email) return

    queue.enqueue({
      recipient: primaryTraveler.email,
      channel: NotificationChannel.EMAIL,
      template: NotificationTemplate.PAYMENT_FAILED,
      payload: {
        bookingNumber: event.booking.bookingNumber,
        reason: event.reason,
      },
    })
  })
}
