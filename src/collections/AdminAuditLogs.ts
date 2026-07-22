import type { CollectionConfig } from 'payload'

export const AdminAuditLogs: CollectionConfig = {
  slug: 'admin-audit-logs',
  admin: {
    useAsTitle: 'auditId',
    defaultColumns: ['auditId', 'adminEmail', 'action', 'targetDomain', 'targetId', 'executedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'auditId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'adminUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'adminEmail',
      type: 'text',
      required: true,
    },
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'targetDomain',
      type: 'select',
      required: true,
      options: [
        { label: 'Booking', value: 'booking' },
        { label: 'Payment', value: 'payment' },
        { label: 'Loyalty', value: 'loyalty' },
        { label: 'Experience', value: 'experience' },
        { label: 'Customer', value: 'customer' },
        { label: 'Maintenance', value: 'maintenance' },
      ],
    },
    {
      name: 'targetId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'reason',
      type: 'text',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
    },
    {
      name: 'executedAt',
      type: 'date',
      required: true,
    },
  ],
  timestamps: true,
}
