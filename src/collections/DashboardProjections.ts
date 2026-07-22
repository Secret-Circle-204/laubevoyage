import type { CollectionConfig } from 'payload'

export const DashboardProjections: CollectionConfig = {
  slug: 'dashboard-projections',
  admin: {
    useAsTitle: 'projectionId',
    defaultColumns: ['projectionId', 'customer', 'version', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'projectionId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'projectionJson',
      type: 'json',
      required: true,
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
    },
  ],
  timestamps: true,
}
