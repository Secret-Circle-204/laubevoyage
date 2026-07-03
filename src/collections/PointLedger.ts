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
      if (user?.role === 'admin' || user?.role === 'super_admin') return true
      return {
        user: {
          equals: user?.id,
        },
      }
    },
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'super_admin',
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Earned', value: 'earned' },
        { label: 'Redeemed', value: 'redeemed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Reversed', value: 'reversed' },
        { label: 'Bonus', value: 'bonus' },
        { label: 'Expired', value: 'expired' },
        { label: 'Tier Upgrade', value: 'tier_upgrade' },
        { label: 'Welcome Bonus', value: 'welcome_bonus' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Positive for earning, negative for spending',
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
