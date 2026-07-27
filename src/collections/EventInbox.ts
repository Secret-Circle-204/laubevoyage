import type { CollectionConfig } from 'payload'

export const EventInbox: CollectionConfig = {
  slug: 'event-inbox',
  admin: {
    useAsTitle: 'idempotencyKey',
    defaultColumns: ['idempotencyKey', 'processedEventId', 'subscriberName', 'processedAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'processedEventId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'subscriberName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'processedAt',
      type: 'date',
      required: true,
    },
  ],
  timestamps: true,
}
