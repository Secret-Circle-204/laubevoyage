import type { CollectionConfig } from 'payload'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'oldSlug',
    defaultColumns: ['oldSlug', 'newSlug', 'statusCode', 'createdAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'redirectId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'oldSlug',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'newSlug',
      type: 'text',
      required: true,
    },
    {
      name: 'statusCode',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        { label: '301 Permanent', value: '301' },
        { label: '302 Temporary', value: '302' },
      ],
    },
  ],
  timestamps: true,
}
