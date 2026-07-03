import { CollectionConfig } from 'payload'
import { publicReadAdminWrite } from '../access'

export const Hotels: CollectionConfig = {
  slug: 'hotels',
  access: publicReadAdminWrite,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'location', 'stars', 'updatedAt'],
    listSearchableFields: ['name', 'location'],
    group: 'Collections',
    hidden: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'location',
      type: 'text',
      required: true,
    },
    {
      name: 'stars',
      type: 'number',
      min: 1,
      max: 5,
      required: true,
      admin: {
        placeholder: 'Star rating (1-5)',
      },
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'amenities',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Pool', value: 'pool' },
        { label: 'Spa', value: 'spa' },
        { label: 'Gym', value: 'gym' },
        { label: 'WiFi', value: 'wifi' },
        { label: 'Restaurant', value: 'restaurant' },
        { label: 'All Inclusive', value: 'all-inclusive' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
    },
  ],
}
