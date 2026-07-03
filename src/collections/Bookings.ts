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
      name: 'pricing',
      type: 'group',
      fields: [
        {
          name: 'basePrice',
          type: 'number',
          required: true,
          admin: {
            description: 'Base price in EGP',
          },
        },
        {
          name: 'pointsRedeemed',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'pointsValue',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Value in EGP',
          },
        },
        {
          name: 'totalAmount',
          type: 'number',
          required: true,
          admin: {
            description: 'Final amount in EGP after points redemption',
          },
        },
        {
          name: 'currency',
          type: 'select',
          required: true,
          defaultValue: 'EGP',
          options: [
            { label: 'EGP', value: 'EGP' },
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'AED', value: 'AED' },
            { label: 'SAR', value: 'SAR' },
          ],
        },
        // Currency Snapshot — frozen at booking creation
        {
          name: 'basePriceEGP',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Original base price in EGP at time of booking',
          },
        },
        {
          name: 'exchangeRateUsed',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Exchange rate used at time of booking',
          },
        },
        {
          name: 'displayAmount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Converted amount shown to the traveler',
          },
        },
        {
          name: 'displayCurrency',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Currency code shown to the traveler',
          },
        },
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
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional booking data',
      },
    },
  ],
  timestamps: true,
}
