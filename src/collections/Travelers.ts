import type { CollectionConfig } from 'payload'

export const Travelers: CollectionConfig = {
  slug: 'travelers',
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['firstName', 'lastName', 'email', 'phone', 'nationality', 'passportNumber'],
    group: 'Customers',
    description: 'Authoritative company-wide persistent registry of all individuals who have traveled with L\'Aube Voyage.',
  },
  access: {
    // Sensitive PII & Travel Identity: Restrict direct API access strictly to authenticated staff/admins
    read: ({ req: { user } }) => {
      if (user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return false
    },
    create: ({ req: { user } }) => {
      if (user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return false
    },
    update: ({ req: { user } }) => {
      if (user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')) return true
      return false
    },
    // Permanent Company Registry: Direct deletion of canonical traveler records is strictly forbidden
    delete: () => false,
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'email',
      type: 'email',
      required: false,
      index: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: false,
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      required: false,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'passportNumber',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'nationality',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Internal operational notes or preferences for this traveler.',
      },
    },
  ],
  timestamps: true,
}
