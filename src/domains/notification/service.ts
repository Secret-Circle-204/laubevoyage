import { NotificationChannel, NotificationTemplate } from '@/types'
import type { Payload } from 'payload'

/**
 * Notification Domain Service
 * Single source for all notifications (Email, SMS, Push, WhatsApp)
 */
export class NotificationService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Send notification through specified channel
   */
  async send(
    userId: string,
    template: NotificationTemplate,
    channel: NotificationChannel,
    data: Record<string, any>,
  ) {
    const user = await this.payload.findByID({
      collection: 'users',
      id: userId,
    })

    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(user.email, template, data)
        break

      case NotificationChannel.SMS:
        if (user.phone) {
          await this.sendSMS(user.phone, template, data)
        }
        break

      case NotificationChannel.PUSH:
        await this.sendPush(userId, template, data)
        break

      case NotificationChannel.WHATSAPP:
        if (user.phone) {
          await this.sendWhatsApp(user.phone, template, data)
        }
        break
    }
  }

  /**
   * Send email
   */
  private async sendEmail(
    email: string,
    template: NotificationTemplate,
    data: Record<string, any>,
  ) {
    // TODO: Implement email sending (e.g., using Resend, SendGrid, etc.)
    console.log(`[Email] ${template} to ${email}`, data)
  }

  /**
   * Send SMS
   */
  private async sendSMS(phone: string, template: NotificationTemplate, data: Record<string, any>) {
    // TODO: Implement SMS sending (e.g., using Twilio)
    console.log(`[SMS] ${template} to ${phone}`, data)
  }

  /**
   * Send push notification
   */
  private async sendPush(
    userId: string,
    template: NotificationTemplate,
    data: Record<string, any>,
  ) {
    // TODO: Implement push notifications (e.g., using FCM)
    console.log(`[Push] ${template} to ${userId}`, data)
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsApp(
    phone: string,
    template: NotificationTemplate,
    data: Record<string, any>,
  ) {
    // TODO: Implement WhatsApp sending (e.g., using Twilio API)
    console.log(`[WhatsApp] ${template} to ${phone}`, data)
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(bookingId: string) {
    const booking = await this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
    })

    const userId =
      typeof booking.user === 'object' && booking.user !== null
        ? String(booking.user.id)
        : String(booking.user)

    await this.send(userId, NotificationTemplate.BOOKING_CONFIRMED, NotificationChannel.EMAIL, {
      bookingNumber: booking.bookingNumber,
      // Add more booking details
    })
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userId: string) {
    await this.send(userId, NotificationTemplate.WELCOME, NotificationChannel.EMAIL, {})
  }

  /**
   * Send tier upgrade notification
   */
  async sendTierUpgrade(userId: string, newTier: string) {
    await this.send(userId, NotificationTemplate.TIER_UPGRADED, NotificationChannel.EMAIL, {
      tier: newTier,
    })
  }
}
