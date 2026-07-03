import { CollectionConfig, APIError } from 'payload'
import { extractExcerpt, formatSlug } from '../utilities/hooks'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const Packages: CollectionConfig = {
  slug: 'packages',
  orderable: true,
  access: publicReadAdminWrite,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['heroImage', 'title', 'relatedDestination', 'adultPrice', 'quickActions'],
    listSearchableFields: ['title', 'slug'],
    group: 'Collections',
  },
  hooks: {
    beforeChange: [formatSlug('title'), extractExcerpt('description')],
    afterChange: [() => revalidateCollection('packages')],
    afterDelete: [() => revalidateCollection('packages')],
    beforeDelete: [
      async ({ req, id }) => {
        const bookings = await req.payload.find({
          collection: 'bookings',
          where: {
            package: {
              equals: id,
            },
          },
          limit: 0,
        })

        if (bookings.totalDocs > 0) {
          throw new APIError(
            `Cannot delete package: It is referenced by ${bookings.totalDocs} bookings. Please delete or reassign them first.`,
            400,
          )
        }
      },
    ],
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
        custom: {
          // icon property removed
        },
      },
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
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Select or create a city',
        allowCreate: true,
      },
      hasMany: true,
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
      name: 'hotels',
      type: 'relationship',
      relationTo: 'hotels',
      hasMany: true,
      admin: {
        description: 'Select hotels associated with this package',
        position: 'sidebar',
      },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'adultPrice',
          type: 'number',
          required: true,
          admin: {
            width: '50%',
            components: {
              Field: '@/components/payload/Fields/NumberField',
              Cell: '@/components/payload/Cells/PriceBadgeCell',
            },
            custom: {
              prefix: '$',
            },
          },
        },
        {
          name: 'infantPrice',
          type: 'number',
          required: true,
          admin: {
            width: '50%',
            components: {
              Field: '@/components/payload/Fields/NumberField',
            },
            custom: {
              prefix: '$',
            },
          },
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      admin: {
        hidden: true, // Legacy field, keeping for compatibility but will use adultPrice
      },
    },
    {
      name: 'dates',
      type: 'array',
      labels: {
        singular: 'Date',
        plural: 'Dates',
      },
      admin: {
        components: {
          Field: '@/components/payload/Fields/DatesTableField#DatesTableField',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'startDate',
              type: 'date',
              required: false,
            },
            {
              name: 'endDate',
              type: 'date',
              required: false,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'adultPrice',
              label: 'Adult Price (per date)',
              type: 'number',
              admin: {
                width: '50%',
                description: 'Leave empty to use the package default price',
                components: {
                  Field: '@/components/payload/Fields/NumberField',
                },
                custom: {
                  prefix: '$',
                },
              },
            },
            {
              name: 'infantPrice',
              label: 'Infant Price (per date)',
              type: 'number',
              admin: {
                width: '50%',
                description: 'Leave empty to use the package default price',
                components: {
                  Field: '@/components/payload/Fields/NumberField',
                },
                custom: {
                  prefix: '$',
                },
              },
            },
          ],
        },
      ],
    },

    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'itinerary',
      type: 'richText',
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Automatically generated from description if left blank',
      },
    },
    {
      name: 'whatsIncluded',
      type: 'richText',
      admin: {
        description: 'Detail transfers, meals, insurance, etc.',
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
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
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
