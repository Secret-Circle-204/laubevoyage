import type { CollectionConfig } from 'payload'

export const Currencies: CollectionConfig = {
  slug: 'currencies',
  admin: {
    useAsTitle: 'isoCode',
    defaultColumns: ['isoCode', 'name', 'symbol', 'isActive', 'isDefault'],
    description: 'Master Catalog of Currencies (Identity only, no live rates)',
  },
  access: {
    read: () => true, // Publicly readable for active currencies
  },
  fields: [
    {
      name: 'isoCode',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISO 4217 Currency Code (e.g., USD, EUR, JPY)',
      },
    },
    {
      name: 'numericCode',
      type: 'number',
      required: true,
      admin: {
        description: 'ISO 4217 Numeric Code (e.g., 840 for USD)',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Full name (e.g., US Dollar)',
      },
    },
    {
      name: 'symbol',
      type: 'text',
      required: true,
      admin: {
        description: 'Common symbol (e.g., $)',
      },
    },
    {
      name: 'nativeSymbol',
      type: 'text',
      admin: {
        description: 'Native symbol (e.g., US$)',
      },
    },
    {
      name: 'decimals',
      type: 'number',
      required: true,
      defaultValue: 2,
      admin: {
        description: 'Number of decimal places (e.g., 2 for USD, 0 for JPY)',
      },
    },

    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Enable or disable this currency in the frontend',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
