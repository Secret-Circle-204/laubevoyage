import type { CollectionConfig } from 'payload'

export const CustomerNotificationPreferences: CollectionConfig = {
  slug: 'customer-notification-preferences',
  admin: {
    useAsTitle: 'customer',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      unique: true,
    },
    {
      name: 'marketingEmail',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'marketingSMS',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'marketingPush',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'bookingEmail',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'bookingSMS',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'bookingPush',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
