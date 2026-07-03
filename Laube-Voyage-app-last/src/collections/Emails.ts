import { CollectionConfig } from 'payload'
import { sendEmail, getVerificationTemplate, getWelcomeTemplate, getResetPasswordTemplate } from '../services/email'

export const Emails: CollectionConfig = {
  slug: 'emails',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'to', 'type', 'status', 'createdAt'],
    listSearchableFields: ['subject', 'to'],
    group: 'Management',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        to: {
          equals: user?.email,
        },
      }
    },
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'to',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Welcome', value: 'welcome' },
        { label: 'Verification', value: 'verification' },
        { label: 'Booking Confirmation', value: 'booking_confirmation' },
        { label: 'Loyalty Tier Jump', value: 'tier_jump' },
        { label: 'Points Earned', value: 'points_earned' },
        { label: 'Reset Password', value: 'reset_password' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: false,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Template variables and debugging data',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          console.log(`[Email Service] Processing ${doc.type} for ${doc.to}...`)

          let html = ''
          const subject = doc.subject

          // If content is empty, try to generate from template if user data is available
          if (doc.user) {
            try {
              const user = await req.payload.findByID({
                collection: 'users',
                id: typeof doc.user === 'object' ? doc.user.id : doc.user,
                req,
              })

              if (doc.type === 'verification' && user.verificationCode) {
                html = getVerificationTemplate(user.verificationCode)
              } else if (doc.type === 'welcome') {
                html = getWelcomeTemplate(user.name || user.email.split('@')[0])
              } else if (doc.type === 'reset_password' && doc.metadata && typeof doc.metadata === 'object' && 'token' in doc.metadata && typeof doc.metadata.token === 'string') {
                html = getResetPasswordTemplate(doc.metadata.token)
              }
            } catch (error) {
              console.error('Error fetching user for email template:', error)
            }
          }

          if (html) {
            const fromType = doc.type === 'booking_confirmation' ? 'reservation' : 'contact'
            const result = await sendEmail({
              to: doc.to,
              subject: subject,
              html: html,
              fromType,
            })

            await req.payload.update({
              collection: 'emails',
              id: doc.id,
              data: {
                status: result.success ? 'sent' : 'failed',
                metadata: {
                  ...doc.metadata,
                  messageId: result.messageId,
                  error: result.error,
                  sentAt: new Date().toISOString(),
                },
              },
              req,
            })
          }
        }
      },
    ],
  },
}
