import { NotificationChannel, NotificationTemplate } from '@/types'
import type { Payload, PayloadRequest } from 'payload'
import nodemailer from 'nodemailer'
import type { Experience } from '@/payload-types'

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
   * Get SMTP transporter configured from environment variables
   */
  private getTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    const secure = process.env.SMTP_SECURE === 'true'
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASSWORD

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    })
  }

  /**
   * Send notification through specified channel
   */
  async send(
    userId: number,
    template: NotificationTemplate,
    channel: NotificationChannel,
    data: Record<string, unknown>,
    req?: PayloadRequest,
  ) {
    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
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
   * Send email using SMTP transporter
   */
  private async sendEmail(
    email: string,
    template: NotificationTemplate,
    data: Record<string, unknown>,
  ) {
    try {
      const transporter = this.getTransporter()
      const subject = this.getEmailSubject(template, data)
      const html = this.getEmailHtml(template, data)
      const fromEmail = process.env.SMTP_USER || 'no-reply@laubevoyage.com'

      const info = await transporter.sendMail({
        from: `"Laube Voyage" <${fromEmail}>`,
        to: email,
        subject,
        html,
      })

      console.log(`[Email Service] Sent ${template} email successfully to ${email}. Message ID: ${info.messageId}`)
    } catch (error) {
      console.error(`[Email Service] Failed to send ${template} email to ${email}:`, error)
      throw error // Fail loudly
    }
  }

  /**
   * Send SMS (Placeholder)
   */
  private async sendSMS(phone: string, template: NotificationTemplate, data: Record<string, unknown>) {
    // TODO: Implement SMS sending (e.g., using Twilio)
    console.log(`[SMS] ${template} to ${phone}`, data)
  }

  /**
   * Send push notification (Placeholder)
   */
  private async sendPush(
    userId: number,
    template: NotificationTemplate,
    data: Record<string, unknown>,
  ) {
    // TODO: Implement push notifications (e.g., using FCM)
    console.log(`[Push] ${template} to ${userId}`, data)
  }

  /**
   * Send WhatsApp message (Placeholder)
   */
  private async sendWhatsApp(
    phone: string,
    template: NotificationTemplate,
    data: Record<string, unknown>,
  ) {
    // TODO: Implement WhatsApp sending (e.g., using Twilio API)
    console.log(`[WhatsApp] ${template} to ${phone}`, data)
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(bookingId: number, req?: PayloadRequest) {
    const booking = await this.payload.findByID({
      collection: 'bookings',
      id: bookingId,
      req,
    })

    const userId =
      typeof booking.user === 'object' && booking.user !== null
        ? Number(booking.user.id)
        : Number(booking.user)

    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })

    const experienceDoc = typeof booking.experience === 'object' && booking.experience !== null
      ? (booking.experience as Experience)
      : await this.payload.findByID({ collection: 'experiences', id: Number(booking.experience), req })

    const name = `${user.firstName} ${user.lastName}`
    const packageTitle = experienceDoc.title
    const date = new Date(booking.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const pricingSnapshot = booking.pricingSnapshot
    const totalPrice = pricingSnapshot?.totalAmountEGP || 0
    const pointsEarned = booking.pointsEarned || 0

    await this.send(userId, NotificationTemplate.BOOKING_CONFIRMED, NotificationChannel.EMAIL, {
      name,
      packageTitle,
      date,
      totalPrice,
      pointsEarned,
    }, req)
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userId: number, req?: PayloadRequest) {
    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })
    const name = `${user.firstName} ${user.lastName}`
    await this.send(userId, NotificationTemplate.WELCOME, NotificationChannel.EMAIL, {
      name,
    }, req)
  }

  /**
   * Send tier upgrade notification
   */
  async sendTierUpgrade(userId: number, newTier: string, req?: PayloadRequest) {
    const user = await this.payload.findByID({
      collection: 'customers',
      id: userId,
      req,
    })
    const name = `${user.firstName} ${user.lastName}`
    await this.send(userId, NotificationTemplate.TIER_UPGRADED, NotificationChannel.EMAIL, {
      name,
      tier: newTier,
    }, req)
  }

  /**
   * Helper to get email subject based on template
   */
  private getEmailSubject(template: NotificationTemplate, data: Record<string, unknown>): string {
    switch (template) {
      case NotificationTemplate.WELCOME:
        return "Welcome to L'Aube Voyage - Your sanctuary awaits"
      case NotificationTemplate.EMAIL_VERIFICATION:
        return "Verification Code - L'Aube Voyage"
      case NotificationTemplate.BOOKING_CONFIRMED:
        return "Journey Confirmed - L'Aube Voyage"
      case NotificationTemplate.BOOKING_CANCELLED:
        return "Journey Cancelled - L'Aube Voyage"
      case NotificationTemplate.TIER_UPGRADED:
        return `Ascended Membership: ${String(data.tier || '').toUpperCase()} - L'Aube Voyage`
      default:
        return "L'Aube Voyage Notification"
    }
  }

  /**
   * Helper to generate HTML content based on template
   */
  private getEmailHtml(template: NotificationTemplate, data: Record<string, unknown>): string {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

    switch (template) {
      case NotificationTemplate.WELCOME: {
        const name = String(data.name || 'Valued Member')
        return `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #00AEEF20;">
            <h1 style="color: #00AEEF; text-transform: uppercase; letter-spacing: 4px; border-bottom: 1px solid #333; padding-bottom: 20px; font-style: italic;">Welcome, ${name}</h1>
            <p style="font-size: 18px; line-height: 1.6; color: #A7AAAC;">Your passport to excellence has been activated. We are honored to have you join our private circle of travelers.</p>
            <div style="margin: 40px 0;">
              <p style="color: #FFFFFF; font-weight: bold;">Unlock Your First Experience:</p>
              <ul style="color: #A7AAAC; line-height: 2;">
                <li>Access Private Collections</li>
                <li>Track Exclusive Loyalty Rewards</li>
                <li>Bespoke Concierge Support</li>
              </ul>
            </div>
            <a href="${serverUrl}/dashboard" style="display: inline-block; background: #00AEEF; color: #0A0A0A; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Enter Your Sanctuary</a>
          </div>
        `
      }

      case NotificationTemplate.EMAIL_VERIFICATION: {
        const code = String(data.code || '000000')
        return `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #F5822020;">
            <h1 style="color: #F58220; text-transform: uppercase; letter-spacing: 4px; border-bottom: 1px solid #333; padding-bottom: 20px; font-style: italic;">My Laube Voyage</h1>
            <p style="font-size: 18px; line-height: 1.6; color: #A7AAAC;">Welcome to the circle of excellence. To finalize your membership, please use the secure verification code below:</p>
            <div style="background: #ffffff05; border: 1px dashed #F58220; padding: 30px; border-radius: 20px; text-align: center; margin: 40px 0;">
              <span style="font-size: 48px; letter-spacing: 12px; font-weight: bold; color: #FFFFFF;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #666; font-style: italic;">This code will expire shortly. If you did not request this, please disregard this transmission.</p>
            <div style="margin-top: 50px; border-top: 1px solid #333; pt-20px; text-align: center;">
              <p style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 2px;">Global Bespoke Travel Experience</p>
            </div>
          </div>
        `
      }

      case NotificationTemplate.BOOKING_CONFIRMED: {
        const name = String(data.name || 'Valued Member')
        const packageTitle = String(data.packageTitle || '')
        const date = String(data.date || '')
        const totalPrice = Number(data.totalPrice || 0)
        const pointsEarned = Number(data.pointsEarned || 0)
        return `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #F5822030;">
            <div style="text-align: center; margin-bottom: 40px;">
               <h1 style="color: #F58220; text-transform: uppercase; letter-spacing: 6px; font-style: italic; margin: 0;">Laube Voyage</h1>
               <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 10px;">Confirmed Reservation</p>
            </div>
            <h2 style="color: #FFFFFF; font-size: 24px; border-bottom: 1px solid #333; padding-bottom: 15px;">Your Journey is Confirmed, ${name}</h2>
            
            <div style="background: #ffffff05; padding: 25px; border-radius: 20px; margin: 30px 0;">
              <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Experience</p>
              <p style="margin: 5px 0 20px 0; color: #FFFFFF; font-size: 18px; font-weight: bold;">${packageTitle}</p>
              
              <div style="display: flex; gap: 40px;">
                <div style="flex: 1;">
                  <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Departure</p>
                  <p style="margin: 5px 0 0 0; color: #FFFFFF; font-weight: bold;">${date}</p>
                </div>
                <div style="flex: 1;">
                  <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                  <p style="margin: 5px 0 0 0; color: #F58220; font-weight: bold;">EGP ${totalPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div style="border-left: 3px solid #00AEEF; padding: 20px; background: #00AEEF05; margin: 30px 0; border-radius: 0 15px 15px 0;">
              <p style="margin: 0; color: #00AEEF; font-size: 14px; font-weight: bold; text-transform: uppercase;">Loyalty Reward</p>
              <p style="margin: 10px 0 0 0; color: #A7AAAC; line-height: 1.6;">You have earned <span style="color: #FFFFFF; font-weight: bold;">${pointsEarned.toLocaleString()} points</span> for this journey. They have been credited to your sanctuary account.</p>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.8; text-align: center; margin-top: 40px;">
              Our concierge team will contact you shortly to refine the final details of your bespoke experience.
            </p>

            <div style="text-align: center; margin-top: 40px;">
              <a href="${serverUrl}/dashboard" style="display: inline-block; background: #FFFFFF; color: #0A0A0A; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">View Your Itinerary</a>
            </div>
          </div>
        `
      }

      case NotificationTemplate.BOOKING_CANCELLED: {
        const name = String(data.name || 'Valued Member')
        const bookingNumber = String(data.bookingNumber || '')
        const packageTitle = String(data.packageTitle || '')
        return `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #D9534F20;">
            <div style="text-align: center; margin-bottom: 40px;">
               <h1 style="color: #D9534F; text-transform: uppercase; letter-spacing: 6px; font-style: italic; margin: 0;">Laube Voyage</h1>
               <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 10px;">Booking Cancellation</p>
            </div>
            <h2 style="color: #FFFFFF; font-size: 24px; border-bottom: 1px solid #333; padding-bottom: 15px;">Your Journey is Cancelled</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #A7AAAC;">Hello ${name}, your booking <strong>#${bookingNumber}</strong> for <strong>${packageTitle}</strong> has been cancelled.</p>
            <div style="border-left: 3px solid #D9534F; padding: 20px; background: #D9534F05; margin: 30px 0; border-radius: 0 15px 15px 0;">
              <p style="margin: 0; color: #D9534F; font-size: 14px; font-weight: bold; text-transform: uppercase;">Refund Details</p>
              <p style="margin: 10px 0 0 0; color: #A7AAAC; line-height: 1.6;">If points were redeemed, they have been restored to your point balance. Any points earned from this booking have been reversed.</p>
            </div>
            <p style="font-size: 14px; color: #666; font-style: italic; text-align: center; margin-top: 40px;">If you have questions regarding your refund or wish to book another experience, please contact our concierge support.</p>
          </div>
        `
      }

      case NotificationTemplate.TIER_UPGRADED: {
        const name = String(data.name || 'Valued Member')
        const tier = String(data.tier || '')
        return `
          <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #F5822030;">
            <div style="text-align: center; margin-bottom: 40px;">
               <h1 style="color: #F58220; text-transform: uppercase; letter-spacing: 6px; font-style: italic; margin: 0;">Laube Voyage</h1>
               <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 10px;">Sanctuary Tier Upgrade</p>
            </div>
            <h2 style="color: #FFFFFF; font-size: 24px; border-bottom: 1px solid #333; padding-bottom: 15px;">Congratulations, ${name}</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #A7AAAC;">You have successfully ascended to the status of <strong style="color: #FFFFFF;">${tier.toUpperCase()}</strong>.</p>
            <div style="border-left: 3px solid #F58220; padding: 20px; background: #F5822005; margin: 30px 0; border-radius: 0 15px 15px 0;">
              <p style="margin: 0; color: #F58220; font-size: 14px; font-weight: bold; text-transform: uppercase;">New Benefits Unlocked</p>
              <p style="margin: 10px 0 0 0; color: #A7AAAC; line-height: 1.6;">You will now earn points at an enhanced rate and unlock unique bonuses on our bespoke collections.</p>
            </div>
            <div style="text-align: center; margin-top: 40px;">
              <a href="${serverUrl}/dashboard" style="display: inline-block; background: #F58220; color: #0A0A0A; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">View Your Benefits</a>
            </div>
          </div>
        `
      }

      default:
        return `<div style="color: #000;">${JSON.stringify(data)}</div>`
    }
  }
}
