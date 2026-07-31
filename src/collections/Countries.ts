import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'

export const Countries: CollectionConfig = {
  slug: 'countries',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'isActive'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'COUNTRY_MUTATED',
          eventId: `evt_country_${doc.id}_${Date.now()}`,
          correlationId: `corr_country_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          countryCode: doc.code,
          slug: doc.slug,
        })
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'COUNTRY_MUTATED',
          eventId: `evt_country_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_country_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          countryCode: doc.code,
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
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 2,
      admin: {
        position: 'sidebar',
        description: 'ISO 3166-1 alpha-2 country code',
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
      name: 'currency',
      type: 'relationship',
      relationTo: 'currencies',
      admin: {
        position: 'sidebar',
        description: 'Official national display currency for this country (SSOT)',
      },
    },
    {
      name: 'defaultLanguage',
      type: 'relationship',
      relationTo: 'languages',
      admin: {
        position: 'sidebar',
        description: 'Official default language for this country used for default UI rendering',
      },
    },
    {
      name: 'timezone',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Primary IANA Timezone (e.g. Europe/Berlin, Africa/Cairo)',
      },
    },
    {
      name: 'measurementSystem',
      type: 'select',
      defaultValue: 'metric',
      options: [
        { label: 'Metric (km, m, °C)', value: 'metric' },
        { label: 'Imperial (mi, ft, °F)', value: 'imperial' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'weekStart',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        description: 'First day of the week (0 = Sunday, 1 = Monday, 6 = Saturday)',
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
