import type { CollectionConfig } from 'payload'

export const ExchangeRates: CollectionConfig = {
  slug: 'exchange-rates',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['fromCurrency', 'toCurrency', 'rate', 'updatedAt'],
    description: 'Currency exchange rates - EGP is base currency',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'fromCurrency',
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
    {
      name: 'toCurrency',
      type: 'select',
      required: true,
      options: [
        { label: 'EGP', value: 'EGP' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'AED', value: 'AED' },
        { label: 'SAR', value: 'SAR' },
      ],
    },
    {
      name: 'rate',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Exchange rate from base currency',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
