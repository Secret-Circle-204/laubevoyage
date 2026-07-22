import type { CollectionConfig } from 'payload'

export const CustomerAddresses: CollectionConfig = {
  slug: 'customer-addresses',
  admin: {
    useAsTitle: 'street',
    defaultColumns: ['customer', 'type', 'city', 'country', 'isDefault'],
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
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'home',
      options: [
        { label: 'Billing', value: 'billing' },
        { label: 'Shipping', value: 'shipping' },
        { label: 'Home', value: 'home' },
      ],
    },
    {
      name: 'street',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'country',
      type: 'text',
      required: true,
    },
    {
      name: 'postalCode',
      type: 'text',
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
