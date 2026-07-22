import type { CollectionConfig } from 'payload'

export const CustomerTravelers: CollectionConfig = {
  slug: 'customer-travelers',
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['customer', 'firstName', 'lastName', 'relationship'],
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
      name: 'dateOfBirth',
      type: 'date',
    },
    {
      name: 'passportNumber',
      type: 'text',
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
        { label: 'Other', value: 'other' },
      ],
    },
  ],
  timestamps: true,
}
