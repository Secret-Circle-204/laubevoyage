import type { CollectionConfig } from 'payload'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'discountType', 'discountValue', 'status', 'validUntil'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'couponId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      defaultValue: 'percentage',
      options: [
        { label: 'Percentage (%)', value: 'percentage' },
        { label: 'Fixed Amount (EGP)', value: 'fixed_egp' },
      ],
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
    },
    {
      name: 'maxDiscountEGP',
      type: 'number',
    },
    {
      name: 'minSpendEGP',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'usageLimit',
      type: 'number',
      defaultValue: 100,
    },
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'validFrom',
      type: 'date',
    },
    {
      name: 'validUntil',
      type: 'date',
    },
  ],
  timestamps: true,
}
