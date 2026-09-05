import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'

export const Accommodations: CollectionConfig = {
  slug: 'accommodations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'city', 'rating', 'isActive'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'ACCOMMODATION_MUTATED',
          eventId: `evt_acc_${doc.id}_${Date.now()}`,
          correlationId: `corr_acc_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
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
      index: true,
      admin: {
        description: 'Physical establishment name (e.g. Four Seasons Hotel Cairo at Nile Plaza).',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique URL-safe identifier for this property.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'hotel',
      options: [
        { label: 'Hotel', value: 'hotel' },
        { label: 'Resort', value: 'resort' },
        { label: 'Nile Cruise', value: 'cruise' },
        { label: 'Ecolodge / Lodge', value: 'lodge' },
        { label: 'Desert Camp', value: 'camp' },
      ],
      admin: {
        description: 'Hospitality establishment classification.',
      },
    },
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
      required: true,
      index: true,
      admin: {
        description: 'Authoritative geographical city location.',
      },
    },
    {
      name: 'rating',
      type: 'number',
      min: 1,
      max: 5,
      admin: {
        description: 'Curated star classification (1 to 5).',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Primary showcase image of the property.',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      admin: {
        description: 'High-resolution photo gallery of rooms and amenities.',
      },
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
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Curated property overview, highlights, and atmosphere.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
