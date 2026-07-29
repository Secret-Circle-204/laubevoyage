import type { CollectionConfig } from 'payload'

export const EventOutbox: CollectionConfig = {
  slug: 'event-outbox',
  // lockDocuments: false,
  admin: {
    useAsTitle: 'eventId',
    defaultColumns: [
      'eventId',
      'eventType',
      'aggregateType',
      'aggregateId',
      'status',
      'retryCount',
      'occurredAt',
    ],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'eventId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'correlationId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'causationId',
      type: 'text',
      index: true,
    },
    {
      name: 'eventType',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'eventVersion',
      type: 'number',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'aggregateType',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'aggregateId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'payload',
      type: 'json',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Published', value: 'published' },
        { label: 'Failed', value: 'failed' },
        { label: 'Dead Letter', value: 'dead_letter' },
      ],
      index: true,
    },
    {
      name: 'retryCount',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'nextRetryAt',
      type: 'date',
    },
    {
      name: 'errorMessage',
      type: 'text',
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
    },
    {
      name: 'workerId',
      type: 'text',
      index: true,
    },
    {
      name: 'lockExpiresAt',
      type: 'date',
      index: true,
    },
  ],
  timestamps: true,
}
