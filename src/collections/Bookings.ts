import type { CollectionConfig } from 'payload'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'bookingNumber',
    defaultColumns: ['bookingNumber', 'user', 'experience', 'status', 'totalAmount'],
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
  },
  fields: [
    {
      name: 'bookingNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'experience',
      type: 'relationship',
      relationTo: 'experiences',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Payment', value: 'pending_payment' },
        { label: 'Paid', value: 'paid' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Status can only be changed through BookingService',
      },
    },
    {
      name: 'travelers',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'firstName',
          type: 'text',
          required: true,
        },
        {
          name: 'lastName',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
        },
        {
          name: 'dateOfBirth',
          type: 'date',
        },
        {
          name: 'passportNumber',
          type: 'text',
        },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
    },
    {
      name: 'pricingSnapshot',
      type: 'group',
      admin: {
        description: 'Immutable financial record of the booking',
      },
      fields: [
        { name: 'version', type: 'number', defaultValue: 1, admin: { readOnly: true } },
        { name: 'basePriceEGP', type: 'number', required: true, admin: { readOnly: true } },
        { name: 'promotionDiscountEGP', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'couponDiscountEGP', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'loyaltyDiscountEGP', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'subtotalEGP', type: 'number', required: true, admin: { readOnly: true } },
        { name: 'taxes', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'fees', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'totalAmountEGP', type: 'number', required: true, admin: { readOnly: true } },
        
        // Currency & Exchange Data
        { name: 'displayCurrency', type: 'text', required: true, admin: { readOnly: true } },
        { name: 'displayAmount', type: 'number', required: true, admin: { readOnly: true } },
        { name: 'exchangeRate', type: 'number', required: true, admin: { readOnly: true } },
        { name: 'exchangeProvider', type: 'text', admin: { readOnly: true } },
        { name: 'exchangeRateTimestamp', type: 'date', admin: { readOnly: true } },
        { name: 'roundingStrategy', type: 'text', admin: { readOnly: true } },
        { name: 'currencyDecimals', type: 'number', admin: { readOnly: true } },
      ],
    },
    {
      name: 'pointsEarned',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Calculated by LoyaltyService',
      },
    },
    {
      name: 'paymentId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'website',
      options: [
        { label: 'Website', value: 'website' },
        { label: 'Admin', value: 'admin' },
        { label: 'API', value: 'api' },
        { label: 'Partner', value: 'partner' },
        { label: 'Affiliate', value: 'affiliate' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'capacityHold',
      type: 'json',
      admin: {
        description: 'Active/Committed capacity hold entity',
      },
    },
    {
      name: 'pointHold',
      type: 'json',
      admin: {
        description: 'Active/Committed loyalty point hold entity',
      },
    },
    {
      name: 'paymentAttempts',
      type: 'json',
      admin: {
        description: 'Ledger of all payment attempts',
      },
    },
    {
      name: 'timeline',
      type: 'json',
      admin: {
        description: 'Customer-facing lifecycle timeline',
      },
    },
    {
      name: 'auditTrail',
      type: 'json',
      admin: {
        description: 'System audit log entries',
      },
    },
    {
      name: 'documents',
      type: 'json',
      admin: {
        description: 'References to generated documents (Invoice, Voucher, Receipt)',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional booking data',
      },
    },
  ],
  timestamps: true,
}
