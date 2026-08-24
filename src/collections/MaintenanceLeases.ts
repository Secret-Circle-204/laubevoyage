import type { CollectionConfig } from 'payload'

export const MaintenanceLeases: CollectionConfig = {
  slug: 'maintenance-leases',
  dbName: 'maintenance_leases',
  admin: {
    useAsTitle: 'jobName',
    hidden: true,
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'jobName',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'workerId',
      type: 'text',
      required: true,
    },
    {
      name: 'leaseExpiresAt',
      type: 'date',
      required: true,
    },
  ],
  timestamps: true,
}
