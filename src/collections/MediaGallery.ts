import type { CollectionConfig } from 'payload'

export const MediaGallery: CollectionConfig = {
  slug: 'media-gallery',
  admin: {
    useAsTitle: 'altText',
    defaultColumns: ['altText', 'mimeType', 'fileUrl', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'mediaId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'altText',
      type: 'text',
      required: true,
    },
    {
      name: 'fileUrl',
      type: 'text',
      required: true,
    },
    {
      name: 'mimeType',
      type: 'text',
      required: true,
    },
    {
      name: 'format',
      type: 'text',
      defaultValue: 'webp',
    },
  ],
  timestamps: true,
}
