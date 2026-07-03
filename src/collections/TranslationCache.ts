import type { CollectionConfig } from 'payload'

export const TranslationCache: CollectionConfig = {
  slug: 'translation-cache',
  admin: {
    useAsTitle: 'sourceText',
    defaultColumns: ['sourceText', 'fromLanguage', 'toLanguage', 'translatedText'],
    description: 'Persistent cache repository for translated text segments',
  },
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    {
      name: 'sourceText',
      type: 'textarea',
      required: true,
      index: true,
    },
    {
      name: 'fromLanguage',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'toLanguage',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'translatedText',
      type: 'textarea',
      required: true,
    },
  ],
  timestamps: true,
}
