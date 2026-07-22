import type { CollectionConfig } from 'payload'

export const PointLedger: CollectionConfig = {
  slug: 'point-ledger',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'type', 'amount', 'balance', 'createdAt'],
    description: 'Immutable ledger of all loyalty point transactions',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return {
        user: {
          equals: user?.id,
        },
      }
    },
    create: ({ req: { user } }) =>
      !!(user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')),
    update: () => false, // Immutable
    delete: () => false, // Immutable
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'ledgerVersion',
      type: 'number',
      defaultValue: 1,
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'referenceType',
      type: 'select',
      index: true,
      options: [
        { label: 'Booking', value: 'booking' },
        { label: 'Admin Ticket', value: 'admin_ticket' },
        { label: 'System Welcome', value: 'system_welcome' },
        { label: 'Expiration Scan', value: 'expiration_scan' },
      ],
    },
    {
      name: 'referenceId',
      type: 'text',
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Earn', value: 'earn' },
        { label: 'Earned (Legacy)', value: 'earned' },
        { label: 'Redeem', value: 'redeem' },
        { label: 'Redeemed (Legacy)', value: 'redeemed' },
        { label: 'Refund', value: 'refund' },
        { label: 'Refunded (Legacy)', value: 'refunded' },
        { label: 'Reverse', value: 'reverse' },
        { label: 'Reversed (Legacy)', value: 'reversed' },
        { label: 'Welcome Bonus', value: 'welcome_bonus' },
        { label: 'Tier Bonus', value: 'tier_bonus' },
        { label: 'Manual Adjustment', value: 'manual_adjustment' },
        { label: 'Expiration', value: 'expiration' },
        { label: 'Expired (Legacy)', value: 'expired' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Positive for earning/bonus, negative for spending/reversal',
      },
    },
    {
      name: 'balance',
      type: 'number',
      required: true,
      admin: {
        description: 'Running balance after this transaction',
      },
    },
    {
      name: 'reason',
      type: 'text',
      required: true,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        description: 'Expiration date for earned points',
      },
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
  timestamps: true,
}
