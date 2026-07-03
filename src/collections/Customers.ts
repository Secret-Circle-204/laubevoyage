import type { CollectionConfig } from 'payload'
import { afterUserCreate } from './hooks/afterUserCreate'

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: {
    verify: true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'status'],
  },
  hooks: {
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
      ],
      admin: {
        position: 'sidebar',
      },
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
          name: 'locale',
          type: 'select',
          defaultValue: 'en',
          options: [
            { label: 'English', value: 'en' },
            { label: 'العربية', value: 'ar' },
            { label: 'Français', value: 'fr' },
          ],
        },
        {
          name: 'currency',
          type: 'select',
          defaultValue: 'EGP',
          options: [
            { label: 'EGP', value: 'EGP' },
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'AED', value: 'AED' },
            { label: 'SAR', value: 'SAR' },
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
