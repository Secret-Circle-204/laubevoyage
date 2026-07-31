import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'

export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'isActive'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        let countrySlug = ''
        if (doc.country && typeof doc.country === 'object') {
          countrySlug = (doc.country as any).slug || ''
        } else if (doc.country) {
          const countryDoc = await req.payload.findByID({
            collection: 'countries',
            id: doc.country,
            depth: 0,
            req,
          })
          countrySlug = countryDoc?.slug || ''
        }

        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CITY_MUTATED',
          eventId: `evt_city_${doc.id}_${Date.now()}`,
          correlationId: `corr_city_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          countrySlug,
          slug: doc.slug,
        })
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        let countrySlug = ''
        if (doc.country && typeof doc.country === 'object') {
          countrySlug = (doc.country as any).slug || ''
        } else if (doc.country) {
          try {
            const countryDoc = await req.payload.findByID({
              collection: 'countries',
              id: doc.country,
              depth: 0,
              req,
            })
            countrySlug = countryDoc?.slug || ''
          } catch {
            // Ignored on deleted cascades
          }
        }

        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CITY_MUTATED',
          eventId: `evt_city_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_city_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          countrySlug,
          slug: doc.slug,
        })
        return doc
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
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'hero',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gallery',
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
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'keywords',
          type: 'text',
        },
      ],
    },
  ],
}
