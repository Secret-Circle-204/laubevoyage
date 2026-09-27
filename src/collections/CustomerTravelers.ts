import type { CollectionConfig } from 'payload'

export const CustomerTravelers: CollectionConfig = {
  slug: 'customer-travelers',
  admin: {
    useAsTitle: 'relationship',
    defaultColumns: ['customer', 'traveler', 'relationship'],
    group: 'Customers',
    description: 'Saved companion relationships linking a Customer account to canonical Travelers.',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if ('role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return {
        customer: {
          equals: user.id,
        },
      }
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      if ('role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return {
        customer: {
          equals: user.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if ('role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return {
        customer: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if ('role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return {
        customer: {
          equals: user.id,
        },
      }
    },
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
      name: 'traveler',
      type: 'relationship',
      relationTo: 'travelers',
      required: true,
      index: true,
    },
    {
      name: 'relationship',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Spouse', value: 'spouse' },
        { label: 'Child', value: 'child' },
        { label: 'Parent', value: 'parent' },
        { label: 'Friend', value: 'friend' },
        { label: 'Self', value: 'self' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Designate as default travel companion for quick allocation.',
      },
    },
  ],
  timestamps: true,
}
