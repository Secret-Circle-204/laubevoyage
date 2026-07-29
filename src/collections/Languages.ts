import type { CollectionConfig } from 'payload'

export const Languages: CollectionConfig = {
  slug: 'languages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'nativeName', 'code', 'isActive', 'isDefault', 'displayOrder'],
    description: 'Master catalog of active and supported website languages.',
  },
  access: {
    read: () => true, // Publicly readable
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Administrative language name (e.g. English, Arabic)',
      },
    },
    {
      name: 'nativeName',
      type: 'text',
      required: true,
      admin: {
        description: 'Language name as shown in the UI switcher (e.g. English, العربية, Français)',
      },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISO language code (e.g. en, ar, fr)',
      },
    },
    {
      name: 'isRTL',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check if this language is read Right-to-Left (e.g. Arabic)',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Enable or disable this language site-wide',
      },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set as the fallback language for the entire platform',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Order of appearance in the language switcher dropdown',
      },
    },
    {
      name: 'preferredDisplayCurrency',
      type: 'relationship',
      relationTo: 'currencies',
      admin: {
        description: 'The recommended display currency chosen for users browsing in this language (e.g. USD for English, EUR for German)',
      },
    },
  ],
  timestamps: true,
}
