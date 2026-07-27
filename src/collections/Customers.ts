import type { CollectionConfig } from 'payload'
import { afterUserCreate } from './hooks/afterUserCreate'
import { beforeCustomerDelete } from './hooks/beforeCustomerDelete'

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: {
    verify: {
      generateEmailHTML: ({ token, user }) => {
        const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        const verifyURL = `${serverURL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`

        if (process.env.NODE_ENV === 'development') {
          console.log('\n=================================================')
          console.log('EMAIL VERIFICATION LINK')
          console.log(verifyURL)
          console.log('=================================================\n')
        }

        return `<p>Thank you for registering! Please verify your email by clicking the link below:</p>
                <p><a href="${verifyURL}">${verifyURL}</a></p>`
      },
      generateEmailSubject: () => "Verify your email - L'Aube Voyage",
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'status'],
  },
  hooks: {
    beforeDelete: [beforeCustomerDelete],
    afterChange: [afterUserCreate],
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_verification',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Pending Verification', value: 'pending_verification' },
        { label: 'Pending Deletion', value: 'pending_deletion' },
        { label: 'Deleted', value: 'deleted' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'failedLoginAttempts',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'lockedUntil',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'emailVerifiedAt',
      type: 'date',
    },
    {
      name: 'phoneVerifiedAt',
      type: 'date',
    },
    {
      name: 'deletedAt',
      type: 'date',
    },
    {
      name: 'loyalty',
      type: 'group',
      fields: [
        {
          name: 'tier',
          type: 'select',
          required: true,
          defaultValue: 'explorer',
          options: [
            { label: 'Explorer', value: 'explorer' },
            { label: 'Voyager', value: 'voyager' },
            { label: 'Elite', value: 'elite' },
          ],
          admin: {
            readOnly: true,
            description: 'Tier is managed by LoyaltyService',
          },
        },
        {
          name: 'points',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Cached value - source of truth is PointLedger',
          },
        },
        {
          name: 'totalSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Total spent in EGP - used for tier calculation',
          },
        },
        {
          name: 'tierAchievedAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'preferences',
      type: 'group',
      fields: [
        {
          name: 'preferredLocale',
          type: 'text',
          defaultValue: 'en-US',
          admin: {
            description: 'E.g., en-US, ar-EG. Controls dates, numbers, and separators.',
          },
        },
        {
          name: 'preferredLanguage',
          type: 'text',
          defaultValue: 'en',
        },
        {
          name: 'preferredCurrency',
          type: 'text',
          defaultValue: 'EGP',
          admin: {
            description: 'Must match an active ISO Code in Currencies catalog',
          },
        },
        {
          name: 'preferredTimezone',
          type: 'text',
          defaultValue: 'Africa/Cairo',
        },
        {
          name: 'measurementSystem',
          type: 'select',
          defaultValue: 'metric',
          options: [
            { label: 'Metric', value: 'metric' },
            { label: 'Imperial', value: 'imperial' },
          ],
        },
        {
          name: 'notifications',
          type: 'group',
          fields: [
            {
              name: 'email',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'sms',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'push',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
