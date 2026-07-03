import { CollectionConfig } from 'payload'
import { formatSlug } from '../utilities/hooks'
import { publicReadAdminWrite } from '../access'

export const Cities: CollectionConfig = {
  slug: 'cities',
  access: publicReadAdminWrite,
  admin: {
    useAsTitle: 'name',
    group: 'Configuration',
    defaultColumns: ['name', 'slug'],
    hidden: true,
  },
  hooks: {
    beforeChange: [formatSlug('name')],
  },
  fields: [
    {
      name: 'name',
      label: 'City Name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        position: 'sidebar',
        hidden: true,
      },
      unique: true,
    },
  ],
}
