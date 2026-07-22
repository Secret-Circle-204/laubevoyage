import type { CollectionConfig } from 'payload'

export const PaymentTransactions: CollectionConfig = {
  slug: 'payment-transactions',
  admin: {
    useAsTitle: 'transactionId',
    defaultColumns: ['transactionId', 'bookingId', 'provider', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return false
    },
  },
  fields: [
    {
      name: 'transactionId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'bookingId',
      type: 'number',
      required: true,
      index: true,
    },
    {
      name: 'customerId',
      type: 'number',
      required: true,
      index: true,
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'Book Now Pay Later', value: 'bnpl' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'initiated',
      options: [
        { label: 'Initiated', value: 'initiated' },
        { label: 'Processing', value: 'processing' },
        { label: 'Successful', value: 'successful' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Partially Refunded', value: 'partially_refunded' },
      ],
    },
    {
      name: 'session',
      type: 'json',
      admin: {
        description: 'Gateway checkout session details',
      },
    },
    {
      name: 'attempts',
      type: 'json',
      admin: {
        description: 'Immutable ledger of gateway payment attempts',
      },
    },
    {
      name: 'webhookLedger',
      type: 'json',
      admin: {
        description: 'Database-first record of processed webhook event IDs',
      },
    },
    {
      name: 'auditTrail',
      type: 'json',
      admin: {
        description: 'Payment security audit log entries',
      },
    },
    {
      name: 'gatewayReference',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
