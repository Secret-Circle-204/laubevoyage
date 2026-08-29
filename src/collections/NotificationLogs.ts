import type { CollectionConfig } from 'payload'

export const NotificationLogs: CollectionConfig = {
  slug: 'notification-logs',
  admin: {
    useAsTitle: 'notificationId',
    defaultColumns: ['notificationId', 'recipient', 'channel', 'category', 'status', 'attempts'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'notificationId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'referenceType',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'referenceId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'recipient',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'Push', value: 'push' },
        { label: 'WhatsApp', value: 'whatsapp' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Marketing', value: 'marketing' },
        { label: 'Booking', value: 'booking' },
        { label: 'Payment', value: 'payment' },
        { label: 'Loyalty', value: 'loyalty' },
        { label: 'Security', value: 'security' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'High', value: 'high' },
        { label: 'Normal', value: 'normal' },
        { label: 'Low', value: 'low' },
      ],
    },
    {
      name: 'templateId',
      type: 'text',
      required: true,
    },
    {
      name: 'templateData',
      type: 'json',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Processing', value: 'processing' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
        { label: 'DLQ', value: 'dlq' },
      ],
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'lastError',
      type: 'text',
    },
    {
      name: 'sentAt',
      type: 'date',
    },
    {
      name: 'nextAttemptAt',
      type: 'date',
    },
    {
      name: 'lastAttemptAt',
      type: 'date',
    },
  ],
  timestamps: true,
}
