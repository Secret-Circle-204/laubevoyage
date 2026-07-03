import { GlobalConfig } from 'payload'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  access: publicReadAdminWrite,
  admin: {
    group: 'Settings',
  },
  hooks: {
    afterChange: [() => revalidateCollection('home')],
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'subtitle', type: 'text' },
        { name: 'backgroundImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'featuredDestinations',
      type: 'relationship',
      relationTo: 'destinations',
      hasMany: true,
      admin: {
        description: 'Select destinations to highlight in the homepage carousel',
      },
    },
    {
      name: 'videoGallery',
      label: 'Featured Videos',
      type: 'array',
      maxRows: 6,
      admin: {
        description: 'YouTube videos for the homepage video gallery section',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: {
            placeholder: 'e.g., A Day in Dubai',
          },
        },
        {
          name: 'youtubeUrl',
          type: 'text',
          required: true,
          admin: {
            placeholder: 'https://www.youtube.com/watch?v=VIDEO_ID',
            description: 'Full YouTube URL or embed URL',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            placeholder: 'Brief description of the video content',
          },
        },
        {
          name: 'category',
          type: 'select',
          options: [
            { label: 'Destination Lifestyle', value: 'lifestyle' },
            { label: 'Customer Testimonial', value: 'testimonial' },
            { label: 'Event Coverage', value: 'event' },
            { label: 'Behind the Scenes', value: 'bts' },
          ],
        },
        {
          name: 'thumbnail',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Custom thumbnail (optional, uses YouTube default if empty)',
          },
        },
      ],
    },
  ],
}
