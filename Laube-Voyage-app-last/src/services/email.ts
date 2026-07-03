import nodemailer from 'nodemailer'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Optional static transporter verification for env fallback
const defaultTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

defaultTransporter.verify((error) => {
  if (error) {
    console.warn('[Email Service] Default env connection fallback warning:', error.message)
  }
})

export const sendEmail = async ({
  to,
  subject,
  html,
  fromType = 'contact',
}: {
  to: string
  subject: string
  html: string
  fromType?: 'contact' | 'reservation'
}) => {
  try {
    let host = process.env.SMTP_HOST || 'smtp.gmail.com'
    let port = parseInt(process.env.SMTP_PORT || '465', 10)
    let secure = process.env.SMTP_SECURE === 'true'
    let user = process.env.SMTP_USER
    let pass = process.env.SMTP_PASSWORD

    try {
      const payload = await getPayload({ config })
      const settings = await payload.findGlobal({
        slug: 'company-settings',
      })

      if (settings) {
        host = settings.smtpHost || host
        port = typeof settings.smtpPort === 'number' ? settings.smtpPort : port
        secure = typeof settings.smtpSecure === 'boolean' ? settings.smtpSecure : secure

        if (fromType === 'reservation') {
          user = settings.reservationMail?.email || user
          pass = settings.reservationMail?.password || pass
        } else {
          user = settings.contactMail?.email || user
          pass = settings.contactMail?.password || pass
        }
      }
    } catch (dbError) {
      console.warn(
        '[Email Service] Failed to load settings from DB global, falling back to env:',
        dbError,
      )
    }

    const dynamicTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    })

    const fromAddress = user
    const info = await dynamicTransporter.sendMail({
      from: `"Laube Voyage" <${fromAddress}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email Service] Sent dynamically from ${fromAddress} to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email Service] Error sending dynamic email:', error)
    return { success: false, error }
  }
}

export const getVerificationTemplate = (code: string) => `
  <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #F5822020;">
    <h1 style="color: #F58220; text-transform: uppercase; letter-spacing: 4px; border-bottom: 1px solid #333; padding-bottom: 20px; font-style: italic;">My Laube Voyage</h1>
    <p style="font-size: 18px; line-height: 1.6; color: #A7AAAC;">Welcome to the circle of excellence. To finalize your membership, please use the secure verification code below:</p>
    <div style="background: #ffffff05; border: 1px dashed #F58220; padding: 30px; border-radius: 20px; text-align: center; margin: 40px 0;">
      <span style="font-size: 48px; letter-spacing: 12px; font-weight: bold; color: #FFFFFF;">${code || '000000'}</span>
    </div>
    <p style="font-size: 14px; color: #666; font-style: italic;">This code will expire shortly. If you did not request this, please disregard this transmission.</p>
    <div style="margin-top: 50px; border-top: 1px solid #333; pt-20px; text-align: center;">
      <p style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 2px;">Global Bespoke Travel Experience</p>
    </div>
  </div>
`

export const getWelcomeTemplate = (name: string) => `
  <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #00AEEF20;">
    <h1 style="color: #00AEEF; text-transform: uppercase; letter-spacing: 4px; border-bottom: 1px solid #333; padding-bottom: 20px; font-style: italic;">Welcome, ${name || 'Valued Member'}</h1>
    <p style="font-size: 18px; line-height: 1.6; color: #A7AAAC;">Your passport to excellence has been activated. We are honored to have you join our private circle of travelers.</p>
    <div style="margin: 40px 0;">
      <p style="color: #FFFFFF; font-weight: bold;">Unlock Your First Experience:</p>
      <ul style="color: #A7AAAC; line-height: 2;">
        <li>Access Private Collections</li>
        <li>Track Exclusive Loyalty Rewards</li>
        <li>Bespoke Concierge Support</li>
      </ul>
    </div>
    <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/dashboard" style="display: inline-block; background: #00AEEF; color: #0A0A0A; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Enter Your Sanctuary</a>
  </div>
`

export const getResetPasswordTemplate = (token: string) => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const resetUrl = `${serverUrl}/reset-password?token=${token}`
  return `
    <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #231F20; color: #A7AAAC; border-radius: 12px; border: 1px solid #00AEEF;">
      <h1 style="color: #FFFFFF; font-size: 24px; font-weight: normal; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">L'AUBE VOYAGE</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #FFFFFF;">You have requested to reset your password for your L'Aube Voyage account.</p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 30px;">Click the button below to establish a new password for your account.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #F58220; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 0.25em; text-transform: uppercase; border-radius: 4px;">Reset Password</a>
      </div>
      <p style="font-size: 13px; line-height: 1.6; margin-top: 30px; color: #F58220;">This link will expire in 2 hours.</p>
      <p style="font-size: 12px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">If you did not make this request, please disregard this email.</p>
    </div>
  `
}

export const getBookingConfirmationTemplate = ({
  name,
  packageTitle,
  date,
  totalPrice,
  pointsEarned,
}: {
  name: string
  packageTitle: string
  date: string
  totalPrice: number
  pointsEarned: number
}) => `
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
          <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount</p>
          <p style="margin: 5px 0 0 0; color: #F58220; font-weight: bold;">$${totalPrice.toLocaleString()}</p>
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
      <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/dashboard" style="display: inline-block; background: #FFFFFF; color: #0A0A0A; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">View Your Itinerary</a>
    </div>
  </div>
`

// New template for pending booking (before payment)
export const getPendingBookingTemplate = ({
  name,
  packageTitle,
  date,
  totalPrice,
  bookingId,
}: {
  name: string
  packageTitle: string
  date: string
  totalPrice: number
  bookingId: string | number
}) => `
  <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0A0A0A; color: #FFFFFF; border-radius: 40px; border: 1px solid #F5822030;">
    <div style="text-align: center; margin-bottom: 40px;">
       <h1 style="color: #F58220; text-transform: uppercase; letter-spacing: 6px; font-style: italic; margin: 0;">Laube Voyage</h1>
       <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 10px;">Booking Reserved</p>
    </div>

    <h2 style="color: #FFFFFF; font-size: 24px; border-bottom: 1px solid #333; padding-bottom: 15px;">Thank You, ${name}!</h2>
    
    <p style="color: #A7AAAC; font-size: 16px; line-height: 1.8;">Your booking has been received and is awaiting confirmation. Our team will contact you shortly to discuss your journey.</p>
    
    <div style="background: #ffffff05; padding: 25px; border-radius: 20px; margin: 30px 0;">
      <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Booking Reference</p>
      <p style="margin: 5px 0 20px 0; color: #F58220; font-size: 20px; font-weight: bold; letter-spacing: 2px;">#${String(bookingId).slice(-8).toUpperCase()}</p>
      
      <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Experience</p>
      <p style="margin: 5px 0 20px 0; color: #FFFFFF; font-size: 18px; font-weight: bold;">${packageTitle}</p>
      
      <div style="display: flex; gap: 40px;">
        <div style="flex: 1;">
          <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Departure</p>
          <p style="margin: 5px 0 0 0; color: #FFFFFF; font-weight: bold;">${date}</p>
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; color: #A7AAAC; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Estimated Amount</p>
          <p style="margin: 5px 0 0 0; color: #F58220; font-weight: bold;">$${totalPrice.toLocaleString()}</p>
        </div>
      </div>
    </div>

    <div style="border-left: 3px solid #F58220; padding: 20px; background: #F5822005; margin: 30px 0; border-radius: 0 15px 15px 0;">
      <p style="margin: 0; color: #F58220; font-size: 14px; font-weight: bold; text-transform: uppercase;">Next Steps</p>
      <p style="margin: 10px 0 0 0; color: #A7AAAC; line-height: 1.6;">A member of our concierge team will reach out within 24 hours to finalize your journey details and arrange payment.</p>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/dashboard" style="display: inline-block; background: #F58220; color: #0A0A0A; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">View Your Booking</a>
    </div>
    
    <p style="color: #666; font-size: 12px; line-height: 1.8; text-align: center; margin-top: 30px;">
      Questions? Reply to this email or call us at your convenience.
    </p>
  </div>
`

// Admin notification for new booking
export const getAdminBookingNotificationTemplate = ({
  customerName,
  customerEmail,
  customerPhone,
  packageTitle,
  date,
  totalPrice,
  bookingId,
  paymentStatus,
}: {
  customerName: string
  customerEmail: string
  customerPhone?: string
  packageTitle: string
  date: string
  totalPrice: number
  bookingId: string | number
  paymentStatus: 'pending' | 'paid'
}) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f5f5f5;">
    <div style="background: #0A0A0A; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: #F58220; margin: 0;">🆕 New Booking Alert</h1>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Booking ID</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">#${String(bookingId).slice(-8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Payment Status</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="background: ${paymentStatus === 'paid' ? '#22c55e' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${paymentStatus}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Customer</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${customerEmail}">${customerEmail}</a></td>
        </tr>
        ${
          customerPhone
            ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Phone</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="tel:${customerPhone}">${customerPhone}</a></td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Package</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${packageTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Travel Date</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666;">Total</td>
          <td style="padding: 10px 0; font-weight: bold; font-size: 18px; color: #F58220;">$${totalPrice.toLocaleString()}</td>
        </tr>
      </table>
      
      <div style="margin-top: 30px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/bookings/${bookingId}" style="display: inline-block; background: #0A0A0A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Admin Panel</a>
      </div>
    </div>
  </div>
`
