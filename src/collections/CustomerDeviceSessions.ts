import type { CollectionConfig } from 'payload'

export const CustomerDeviceSessions: CollectionConfig = {
  slug: 'customer-device-sessions',
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['customer', 'deviceName', 'ipAddress', 'lastActiveAt', 'isRevoked'],
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
      index: true,
    },
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'deviceName',
      type: 'text',
      required: true,
    },
    {
      name: 'ipAddress',
      type: 'text',
      required: true,
    },
    {
      name: 'lastActiveAt',
      type: 'date',
      required: true,
    },
    {
      name: 'isRevoked',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
