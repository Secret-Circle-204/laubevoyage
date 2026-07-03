import { CollectionConfig, PayloadRequest } from 'payload'
import type { Config } from '../payload-types'
import { randomInt } from 'crypto'
import { adminOrSelf, isAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes lockout after 5 failed attempts
    forgotPassword: {
      generateEmailHTML: (args) => {
        const token = args?.token || ''
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
      },
      generateEmailSubject: () => "Reset Password | L'Aube Voyage",
    }
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isVerified', 'createdAt'],
    listSearchableFields: ['name', 'email'],
    group: 'Personnel',
  },
  access: {
    admin: ({ req: { user } }) => user?.role === 'admin',
    create: () => true, // Anyone can register. Note: User role is securely protected in the field configuration and hooks.
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        id: {
          equals: user?.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        id: {
          equals: user?.id,
        },
      }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create') {
          // Generate cryptographically secure 6-digit verification code
          data.verificationCode = randomInt(100000, 999999).toString()
          data.isVerified = false
          
          // Force customer role and reset metrics on registration if not admin (defense in depth)
          if (!req.user || req.user.role !== 'admin') {
            data.role = 'customer'
            data.loyaltyPoints = 0
            data.totalSpend = 0
            data.loyaltyTier = 'traveler'
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        // 1. Send verification email on registration
        if (operation === 'create' && doc.role === 'customer') {
          await req.payload.create({
            collection: 'emails',
            data: {
              subject: "Verify Your Privilege Membership | L'Aube Voyage",
              to: doc.email,
              type: 'verification',
              user: doc.id,
              status: 'pending',
            },
            req,
          })
        }
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const collectionsToPurge: any[] = [
          'emails',
          'bookings',
          'loyalty-points',
        ]
        for (const slug of collectionsToPurge) {
          try {
            await req.payload.delete({
              collection: slug,
              where: {
                user: {
                  equals: id,
                },
              },
              req,
            })
          } catch (error) {
            console.error(`[Cleanup] Failed to purge ${slug} for user ${id}:`, error)
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
      ],
      defaultValue: 'customer',
      required: true,
      saveToJWT: true,
      access: {
        // Only admins can change roles. (Creation protection is handled safely in beforeChange hook)
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'isVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
      access: {
        // Only admins and the system can toggle verification status
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
    {
      name: 'verificationCode',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'loyaltyTier',
      type: 'select',
      options: [
        { label: 'Traveler', value: 'traveler' },
        { label: 'Explorer', value: 'explorer' },
        { label: 'Voyager', value: 'voyager' },
      ],
      defaultValue: 'traveler',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      access: {
        // Only admins can manually change loyalty tier
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
    {
      name: 'loyaltyPoints',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      access: {
        // Only admins can manually adjust points
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
    {
      name: 'totalSpend',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Total cumulative spend for tier calculation',
        readOnly: true,
      },
      access: {
        // Only admins can manually adjust spend
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
  ],
  endpoints: [
    {
      path: '/forgot-password-check',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        try {
          if (typeof req.json !== 'function') {
            return Response.json({ error: 'System error: Invalid request' }, { status: 500 })
          }
          const body = await req.json()
          const { email } = body

          if (!email) {
            return Response.json({ error: 'Email address is required.' }, { status: 400 })
          }

          // Check if the user exists
          const users = await req.payload.find({
            collection: 'users',
            where: {
              email: { equals: email.trim().toLowerCase() },
            },
          })

          if (users.docs.length === 0) {
            return Response.json(
              { error: 'This email is not registered in our system.' },
              { status: 400 },
            )
          }

          // Trigger Payload native forgotPassword logic with email disabled to fetch the token
          const token = await req.payload.forgotPassword({
            collection: 'users',
            data: { email: email.trim().toLowerCase() },
            disableEmail: true,
          })

          // Create entry in Emails collection to send email via nodemailer log queue
          await req.payload.create({
            collection: 'emails',
            data: {
              subject: "Reset Password | L'Aube Voyage",
              to: email.trim().toLowerCase(),
              type: 'reset_password',
              user: users.docs[0].id,
              status: 'pending',
              metadata: {
                token: token
              }
            },
            req,
          })

          return Response.json({
            success: true,
            message: 'Password reset link sent successfully.',
          })
        } catch (error: any) {
          console.error('Forgot password check error:', error)
          return Response.json({ error: error?.message || 'Failed to send reset link.' }, { status: 500 })
        }
      },
    },
    {
      path: '/verify',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        try {
          if (typeof req.json !== 'function') {
            return Response.json({ error: 'System error: Invalid request' }, { status: 500 })
          }
          const body = await req.json()
          const { email, code } = body

          if (!email || !code) {
            return Response.json(
              { error: 'Identification and access code required.' },
              { status: 400 },
            )
          }

          // Find user by email and verification code
          const users = await req.payload.find({
            collection: 'users',
            where: {
              and: [{ email: { equals: email } }, { verificationCode: { equals: code } }],
            },
          })

          if (users.docs.length === 0) {
            return Response.json({ error: 'Invalid or expired access code.' }, { status: 400 })
          }

          const user = users.docs[0]

          // Update user to verified
          await req.payload.update({
            collection: 'users',
            id: user.id,
            data: {
              isVerified: true,
              verificationCode: '',
            },
            req,
          })

          // Create welcome email
          await req.payload.create({
            collection: 'emails',
            data: {
              subject: "Welcome to the Circle of Excellence | L'Aube Voyage",
              to: user.email,
              type: 'welcome',
              user: user.id,
              status: 'pending',
            },
            req,
          })

          return Response.json({
            success: true,
            message: 'Membership verified. Welcome to the circle.',
          })
        } catch (error) {
          console.error('Verification error:', error)
          return Response.json({ error: 'Our secure gates encountered an issue.' }, { status: 500 })
        }
      },
    },
  ],
}
