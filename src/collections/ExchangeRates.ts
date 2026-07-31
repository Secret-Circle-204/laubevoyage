import type { CollectionConfig } from 'payload'
import { rateRegistry } from '@/domains/currency/rate-registry'
import { EXCHANGE_RATE_SOURCES } from '@/domains/currency/types'

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
  hooks: {
    afterChange: [
      ({ doc }) => {
        rateRegistry.invalidate()
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        rateRegistry.invalidate()
        return doc
      },
    ],
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
      options: Object.values(EXCHANGE_RATE_SOURCES).map((val) => ({
        label: val,
        value: val,
      })),
      defaultValue: EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE,
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
      type: 'collapsible',
      label: 'Sync Diagnostics',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'lastSuccess',
          type: 'date',
          admin: {
            description: 'Last time this rate was successfully synced',
            readOnly: true,
          }
        },
        {
          name: 'lastAttempt',
          type: 'date',
          admin: {
            description: 'Last time a sync was attempted (whether success or fail)',
            readOnly: true,
          }
        },
        {
          name: 'lastError',
          type: 'text',
          admin: {
            description: 'Reason for the last sync failure (e.g. Timeout)',
            readOnly: true,
          }
        },
      ]
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
      admin: {
        position: 'sidebar',
      }
    },
  ],
  timestamps: true, // Payload createdAt/updatedAt
}
