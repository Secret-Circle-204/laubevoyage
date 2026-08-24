import type { CollectionConfig, Field } from 'payload'
import type { Experience } from '@/payload-types'
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
    beforeChange: [
      ({ data }) => {
        if (data && data.type === 'daily_tour') {
          if (data.duration) {
            delete (data.duration as any).days
            delete (data.duration as any).nights
          }
        } else if (data && data.type === 'package') {
          if (data.duration) {
            delete (data.duration as any).durationMinutes
          }
        }
        return data
      },
      extractSlotsPayload,
    ],
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
      name: 'packageMode',
      type: 'select',
      options: [
        { label: 'Fixed Date (Scheduled Departures)', value: 'fixed_date' },
        { label: 'Flexible Date (Customer Selected Date)', value: 'flexible_date' },
      ],
      defaultValue: 'fixed_date',
      admin: {
        position: 'sidebar',
        condition: (data: Record<string, any>) => data?.type === 'package',
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
          min: 1,
          admin: {
            description: 'Total tour duration in days for multi-day Packages (e.g. 5). Required for packages.',
            condition: (data: Partial<Experience>) => data?.type === 'package',
          },
          validate: (val: unknown, { data }: { data: Partial<Experience> }) => {
            if (data?.type === 'package') {
              if (val === undefined || val === null || val === '') {
                return 'Duration in days is required for Packages (minimum 1 day)'
              }
              if (Number(val) < 1) {
                return 'Duration in days must be at least 1'
              }
            }
            return true
          },
        },
        {
          name: 'nights',
          type: 'number',
          min: 0,
          admin: {
            description: 'Total number of nights for multi-day Packages (e.g. 4). Optional.',
            condition: (data: Partial<Experience>) => data?.type === 'package',
          },
        },
        {
          name: 'durationMinutes',
          type: 'number',
          min: 15,
          admin: {
            description: 'Tour duration for Daily Tours entered in Hours (e.g. 3 for 3 hours, 1.5 for 90 minutes) and stored deterministically as minutes. Required for daily_tour.',
            condition: (data: Partial<Experience>) => data?.type === 'daily_tour',
            components: {
              Field: '@/components/admin/DurationHoursField#DurationHoursField',
            },
          },
          validate: (val: unknown, { data }: { data: Partial<Experience> }) => {
            if (data?.type === 'daily_tour') {
              if (val === undefined || val === null || val === '') {
                return 'Duration is required for Daily Tours (minimum 15 minutes / 0.25 hours)'
              }
              if (Number(val) < 15) {
                return 'Duration must be at least 15 minutes (0.25 hours)'
              }
            }
            return true
          },
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      validate: (val: unknown, { data }: { data: Partial<Experience> }) => {
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
      name: 'itinerary',
      type: 'array',
      fields: [
        {
          name: 'dayNumber',
          type: 'number',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
        },
      ],
    } as Field,
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
      name: 'schedules',
      type: 'array',
      admin: {
        description: 'Recurring departure schedules for Daily Tours.',
        condition: (data: Partial<Experience>) => data?.type === 'daily_tour',
      },
      fields: [
        {
          name: 'startTime',
          type: 'text',
          required: true,
          defaultValue: '09:00',
        },
        {
          name: 'defaultCapacity',
          type: 'number',
          admin: {
            description: 'Optional operational vehicle/boat capacity guide.',
          },
        },
        {
          name: 'label',
          type: 'text',
        },
      ],
    },
    {
      name: 'blackouts',
      type: 'array',
      admin: {
        description: 'Blackout dates or specific time exceptions when the tour is unavailable.',
        condition: (data: Partial<Experience>) => data?.type === 'daily_tour',
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'startTime',
          type: 'text',
          admin: {
            description: 'Leave blank to blackout the entire day, or specify a time (e.g. 09:00).',
          },
        },
        {
          name: 'reason',
          type: 'text',
          defaultValue: 'Seasonal Closure / Maintenance',
        },
      ],
    },
    {
      name: 'priceOverrides',
      type: 'array',
      admin: {
        description: 'Date-specific price overrides (e.g. Holiday or Peak Season Pricing).',
        condition: (data: Partial<Experience>) => data?.type === 'daily_tour',
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'startTime',
          type: 'text',
          admin: {
            description: 'Leave blank to apply to all times on this date, or specify (e.g. 09:00).',
          },
        },
        {
          name: 'priceEGP',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'reason',
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
        condition: (data: Partial<Experience>) => data?.type === 'package' && (!data?.packageMode || data?.packageMode === 'fixed_date'),
        components: {
          Field: '@/components/admin/DepartureSlotsEditor#DepartureSlotsEditor',
        },
      },
    },
  ],
}


