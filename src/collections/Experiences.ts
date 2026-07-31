import type { CollectionConfig } from 'payload'
import { extractSlotsPayload } from './hooks/extractSlotsPayload'
import { syncDepartureSlots } from './hooks/syncDepartureSlots'
import { EventBus } from '@/domains/events/event-bus'

const PRICING_SOURCE_BY_TYPE = {
  daily_tour: 'catalog',
  package: 'departure',
} as const

export const Experiences: CollectionConfig = {
  slug: 'experiences',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'city', 'type', 'price', 'availability'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [extractSlotsPayload],
    afterChange: [
      syncDepartureSlots,
      async ({ doc }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'EXPERIENCE_MUTATED',
          eventId: `evt_exp_${doc.id}_${Date.now()}`,
          correlationId: `corr_exp_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          slug: doc.slug,
        })
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'EXPERIENCE_MUTATED',
          eventId: `evt_exp_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_exp_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          slug: doc.slug,
        })
        return doc
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        // Enforce business rule: Do not allow deletion of experience if there are paid/confirmed/completed bookings
        const activeBookings = await req.payload.find({
          collection: 'bookings',
          where: {
            experience: { equals: id },
            status: { in: ['paid', 'confirmed', 'completed'] },
          },
          depth: 0,
          req,
        })
        if (activeBookings.docs.length > 0) {
          throw new Error('Cannot delete experience: there are active, paid, or confirmed bookings associated with it.')
        }

        // Cascade delete all departure slots associated with this experience
        await req.payload.delete({
          collection: 'departure-slots',
          where: {
            experience: { equals: id },
          },
          req,
        })
      },
    ],
  },
  fields: [
    {
      name: 'title',
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Package', value: 'package' },
        { label: 'Daily Tour', value: 'daily_tour' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
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
      name: 'duration',
      type: 'group',
      fields: [
        {
          name: 'days',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'nights',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      validate: (val: unknown, { data }: { data: Record<string, any> }) => {
        if (data?.type === 'daily_tour') {
          if (val === undefined || val === null || val === '') {
            return 'Price is required for Daily Tours'
          }
        }
        if (val !== undefined && val !== null && val !== '') {
          if (Number(val) < 0) {
            return 'Price must be greater than or equal to 0'
          }
        }
        return true
      },
      admin: {
        description: 'Base default price in EGP. Required for Daily Tours; optional for Packages with Departure Slots.',
      },
    },
    {
      name: 'availability',
      type: 'select',
      required: true,
      defaultValue: 'available',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Sold Out', value: 'sold_out' },
        { label: 'Coming Soon', value: 'coming_soon' },
        { label: 'Unavailable', value: 'unavailable' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'included',
      type: 'array',
      fields: [
        {
          name: 'item',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'excluded',
      type: 'array',
      fields: [
        {
          name: 'item',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'policies',
      type: 'richText',
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
    {
      name: '_slotsPayload',
      type: 'json',
      virtual: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'departureSlots',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/DepartureSlotsEditor#DepartureSlotsEditor',
        },
        condition: (data: Record<string, any>) => data?.type === 'package',
      },
    },
  ],
}

