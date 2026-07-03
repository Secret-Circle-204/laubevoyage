import { CollectionConfig } from 'payload'
import { formatSlug } from '../utilities/hooks'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const Excursions: CollectionConfig = {
  slug: 'excursions',
  orderable: true,
  access: publicReadAdminWrite,
  admin: {
    useAsTitle: 'title',
    group: 'Collections',
    defaultColumns: ['mainImage', 'title', 'category', 'price', 'duration', 'quickActions'],
    listSearchableFields: ['title'],
  },
  hooks: {
    beforeChange: [formatSlug('title')],
    afterChange: [() => revalidateCollection('excursions')],
    afterDelete: [() => revalidateCollection('excursions')],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        components: {
          Field: '@/components/payload/Fields/TextField',
        },
      },
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
    {
      name: 'relatedDestination',
      label: 'Destination',
      type: 'relationship',
      relationTo: 'destinations',
      required: false,
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/components/payload/Cells/RelationshipTagCell',
        },
      },
    },
    {
      name: 'city',
      label: 'City / Region',
      type: 'relationship',
      relationTo: 'cities',
      hasMany: true,
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Cities where this excursion is available (used for smart cross-selling)',
        allowCreate: true,
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      admin: {
        components: {
          Cell: '@/components/payload/Cells/PriceBadgeCell',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'duration',
          label: 'Duration',
          type: 'text',
          admin: {
            width: '25%',
            placeholder: 'e.g. 7 Days',
            components: {
              Field: '@/components/payload/Fields/TextField',
            },
            custom: {
              // Simple text field
            },
          },
        },
        {
          name: 'tourType',
          label: 'Tour Type',
          type: 'text',
          admin: {
            width: '25%',
            placeholder: 'e.g. Daily Tour',
            components: {
              Field: '@/components/payload/Fields/TextField',
            },
            custom: {
              // Simple text field
            },
          },
        },
        {
          name: 'groupSize',
          label: 'Group Size',
          type: 'text',
          admin: {
            width: '25%',
            placeholder: 'e.g. 1 person',
            components: {
              Field: '@/components/payload/Fields/TextField',
            },
            custom: {
              // Simple text field
            },
          },
        },
        {
          name: 'languages',
          label: 'Languages',
          type: 'text',
          admin: {
            width: '25%',
            placeholder: 'e.g. English, German',
            components: {
              Field: '@/components/payload/Fields/TextField',
            },
            custom: {
              // Simple text field
            },
          },
        },
      ],
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Sea Trips', value: 'sea-trips' },
        { label: 'Safari & Adventure', value: 'safari-adventure' },
        { label: 'Cultural & History', value: 'cultural-history' },
        { label: 'Family & Kids', value: 'family-kids' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/components/payload/Cells/BadgeCell',
        },
      },
    },
    {
      name: 'description',
      type: 'richText',
      required: false,
    },
    {
      name: 'itinerary',
      type: 'richText',
      admin: {
        description: 'Write the itinerary schedule. Use headings for times and paragraphs for activities.',
      },
    },
    {
      name: 'whatsIncluded',
      type: 'richText',
    },
    {
      name: 'whatToBring',
      type: 'richText',
    },
    {
      name: 'mainImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: {
        components: {
          Cell: '@/components/payload/Cells/ThumbnailCell',
        },
      },
    },
    {
      name: 'quickActions',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/components/payload/Cells/ActionCell',
        },
      },
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Select multiple images for the package gallery (Bulk selection supported)',
        components: {
          Field: '@/components/payload/Fields/GalleryField',
        },
      },
    },
  ],
}
