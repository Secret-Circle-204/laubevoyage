import { CollectionConfig } from 'payload'
import { formatSlug } from '../utilities/hooks'
import { publicReadAdminWrite } from '../access'
import { revalidateCollection } from '../utilities/revalidate'

export const Destinations: CollectionConfig = {
  slug: 'destinations',
  access: publicReadAdminWrite,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'region', 'country', 'updatedAt'],
    listSearchableFields: ['name', 'region', 'country'],
    group: 'Collections',
    hidden: true,
  },
  hooks: {
    beforeChange: [formatSlug('name')],
    afterChange: [() => revalidateCollection('destinations')],
    afterDelete: [() => revalidateCollection('destinations')],
    beforeDelete: [
      async ({ req, id }) => {
        // 1. Find and Unlink Excursions
        const excursions = await req.payload.find({
          collection: 'excursions',
          where: {
            relatedDestination: {
              equals: id,
            },
          },
          limit: 0,
        })

        if (excursions.totalDocs > 0) {
          req.payload.logger.info(
            `[Auto-Unlink] Unlinking ${excursions.totalDocs} excursions from destination ${id}`,
          )
          await req.payload.update({
            collection: 'excursions',
            where: {
              relatedDestination: {
                equals: id,
              },
            },
            data: {
              relatedDestination: null,
            },
          })
        }

        // 2. Find and Unlink Packages
        const packages = await req.payload.find({
          collection: 'packages',
          where: {
            relatedDestination: {
              equals: id,
            },
          },
          limit: 0,
        })

        if (packages.totalDocs > 0) {
          req.payload.logger.info(
            `[Auto-Unlink] Unlinking ${packages.totalDocs} packages from destination ${id}`,
          )
          await req.payload.update({
            collection: 'packages',
            where: {
              relatedDestination: {
                equals: id,
              },
            },
            data: {
              relatedDestination: null,
            },
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
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
      name: 'region',
      type: 'select',
      options: [
        { label: 'Europe', value: 'europe' },
        { label: 'Middle East', value: 'middle-east' },
        { label: 'Africa', value: 'africa' },
        { label: 'Asia', value: 'asia' },
        { label: 'Americas', value: 'americas' },
        { label: 'Local (Egypt)', value: 'local' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'country',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
