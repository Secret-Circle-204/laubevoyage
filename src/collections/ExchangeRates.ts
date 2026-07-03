import type { CollectionConfig } from 'payload'

export const ExchangeRates: CollectionConfig = {
  slug: 'exchange-rates',
  admin: {
    useAsTitle: 'toCurrency',
    defaultColumns: ['fromCurrency', 'toCurrency', 'rate', 'source', 'syncStatus', 'lastUpdate'],
    description: 'Live Financial Data for Exchange Rates',
  },
  access: {
    read: () => true, // Publicly readable for conversion
  },
  fields: [
    {
      name: 'fromCurrency',
      type: 'text',
      required: true,
      defaultValue: 'EGP',
      index: true,
      admin: {
        description: 'Base currency ISO code (e.g. EGP)',
      },
    },
    {
      name: 'toCurrency',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Target currency ISO code (e.g. USD)',
      },
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
      name: 'source',
      type: 'select',
      options: [
        { label: 'OpenExchange', value: 'OpenExchange' },
        { label: 'ECB', value: 'ECB' },
        { label: 'Fixer', value: 'Fixer' },
        { label: 'Manual', value: 'Manual' },
      ],
      defaultValue: 'OpenExchange',
      required: true,
    },
    {
      name: 'lastUpdate',
      type: 'date',
      admin: {
        description: 'Actual timestamp the rate was fetched/changed',
      },
    },
    {
      name: 'lastSuccess',
      type: 'date',
    },
    {
      name: 'lastError',
      type: 'date',
    },
    {
      name: 'syncStatus',
      type: 'select',
      options: [
        { label: 'Synced', value: 'synced' },
        { label: 'Failed', value: 'failed' },
        { label: 'Stale', value: 'stale' },
      ],
      defaultValue: 'synced',
    },
  ],
  timestamps: true, // Payload createdAt/updatedAt
}
