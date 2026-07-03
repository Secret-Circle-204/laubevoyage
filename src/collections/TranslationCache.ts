import type { CollectionConfig } from 'payload'

export const TranslationCache: CollectionConfig = {
  slug: 'translation-cache',
  admin: {
    useAsTitle: 'sourceText',
    defaultColumns: ['originalHash', 'language', 'provider', 'version', 'expiresAt'],
    description: 'Persistent versioned cache for translated text segments with TTL',
  },
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    {
      name: 'originalHash',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'SHA-256 hash of the original English source text',
      },
    },
    {
      name: 'sourceText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'language',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Target locale code (e.g. ar, fr)',
      },
    },
    {
      name: 'translatedText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      admin: {
        description: 'Translation engine used (e.g. google, libre, deepl)',
      },
    },
    {
      name: 'version',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Source document version at the time of translation',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Cache TTL expiry date. Re-translation is triggered after this date.',
      },
    },
  ],
  timestamps: true,
}
