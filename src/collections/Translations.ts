import type { CollectionConfig } from 'payload'

export const Translations: CollectionConfig = {
  slug: 'translations',
  admin: {
    useAsTitle: 'translationKey',
    defaultColumns: ['translationKey', 'locale', 'provider', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'translationKey',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'locale',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'translatedText',
      type: 'text',
      required: true,
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Cache', value: 'cache' },
        { label: 'Google', value: 'google' },
        { label: 'Libre', value: 'libre' },
        { label: 'Manual', value: 'manual' },
      ],
    },
  ],
  timestamps: true,
}
