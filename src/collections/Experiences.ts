import type { CollectionConfig, Field, Where } from 'payload'
import type { Experience } from '@/payload-types'
import { extractSlotsPayload } from './hooks/extractSlotsPayload'
import { syncDepartureSlots } from './hooks/syncDepartureSlots'
import { EventBus } from '@/domains/events/event-bus'
import { AccommodationPolicy } from '@/domains/experience/accommodation-policy'

const PRICING_SOURCE_BY_TYPE = {
  daily_tour: 'catalog',
  package: 'departure',
} as const

export const Experiences: CollectionConfig = {
  slug: 'experiences',
  enableQueryPresets: true,
  admin: {
    useAsTitle: 'title',
    enableListViewSelectAPI: true,
    listSearchableFields: ['title', 'slug'],
    defaultColumns: ['hero', 'title', 'city', 'type', 'price', 'availability'],
    components: {
      views: {
        list: {
          Component: '@/components/admin/universal-table/UniversalListView#UniversalListView',
        },
      },
    },
  },
  forceSelect: {
    title: true,
    slug: true,
    availability: true,
  },
  indexes: [
    {
      fields: ['city', 'updatedAt'],
    },
  ],
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data) {
          // Domain Invariant: Duplicate Origin Protection
          if (data.city && Array.isArray(data.destinations) && data.destinations.length > 0) {
            const originId =
              typeof data.city === 'object' ? Number((data.city as any).id) : Number(data.city)
            const destIds = data.destinations.map((d: any) =>
              typeof d === 'object' ? Number(d.id) : Number(d),
            )
            if (destIds.includes(originId)) {
              throw new Error(
                `[Experiences Validation] Origin city (#${originId}) cannot be included in subsequent destinations list. Destinations represent cities visited AFTER departing the Origin.`,
              )
            }
          }

          if (data.type === 'daily_tour') {
            if (
              Array.isArray((data as any).accommodations) &&
              (data as any).accommodations.length > 0
            ) {
              throw new Error('[Experiences] Daily Tours cannot contain accommodation stays.')
            }
            if (data.duration) {
              delete (data.duration as any).days
              delete (data.duration as any).nights
            }
          } else if (data.type === 'package') {
            if (data.duration) {
              delete (data.duration as any).durationMinutes
            }
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
          throw new Error(
            'Cannot delete experience: there are active, paid, or confirmed bookings associated with it.',
          )
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
      index: true,
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
      index: true,
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
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Origin / Departure Gateway City (where the journey officially commences and initial meeting occurs).',
      },
    },
    {
      name: 'destinations',
      type: 'relationship',
      relationTo: 'cities',
      hasMany: true,
      validate: (val: unknown, { data }: { data: Partial<Experience> }) => {
        if (Array.isArray(val) && val.length > 0 && data?.city) {
          const originId =
            typeof data.city === 'object' ? Number((data.city as any).id) : Number(data.city)
          const destIds = val.map((d: any) => (typeof d === 'object' ? Number(d.id) : Number(d)))
          if (destIds.includes(originId)) {
            return 'Origin city cannot be included in subsequent destinations list. Destinations represent cities visited AFTER departing from the Origin.'
          }
        }
        return true
      },
      admin: {
        position: 'sidebar',
        description:
          'Ordered Post-Origin Destinations (all sequential cities visited AFTER departing from the Origin city). Do NOT re-add the Origin city.',
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
            description:
              'Total tour duration in days for multi-day Packages (e.g. 5). Required for packages.',
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
            description:
              'Tour duration for Daily Tours entered in Hours (e.g. 3 for 3 hours, 1.5 for 90 minutes) and stored deterministically as minutes. Required for daily_tour.',
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
      index: true,
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
        description:
          'Base Journey Price per Adult in EGP — Excluding Accommodation (covers touring, private transport, expert guiding, and included provisions).',
      },
    },
    {
      name: 'availability',
      type: 'select',
      required: true,
      index: true,
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
          name: 'city',
          type: 'relationship',
          relationTo: 'cities',
          admin: {
            description: 'Geographical city waypoint for this specific day (optional).',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
        },
      ],
    } as Field,
    {
      name: 'accommodations',
      type: 'array',
      admin: {
        description: 'Curated accommodation stays included in this multi-day Package.',
        condition: (data: Partial<Experience>) => data?.type === 'package',
        components: {
          Field: '@/components/admin/AccommodationsEditor#AccommodationsEditor',
        },
      },
      validate: (val: unknown, { data }: { data?: Partial<Experience> }) => {
        if (!val || !Array.isArray(val) || val.length === 0) return true
        const type = data?.type || 'package'
        const result = AccommodationPolicy.validate(type, val as unknown[])
        if (!result.valid) {
          return result.errors.join('; ')
        }
        return true
      },
      fields: [
        {
          name: 'order',
          type: 'number',
          required: true,
          min: 1,
          admin: {
            description: 'Sequential order of this stay within the itinerary (1, 2, ...).',
          },
        },
        {
          name: 'nights',
          type: 'number',
          required: true,
          min: 1,
          admin: {
            description: 'Number of nights for this stay (must be >= 1).',
          },
        },
        {
          name: 'options',
          type: 'array',
          required: true,
          minRows: 1,
          admin: {
            description:
              'Curated accommodation options (hotels/resorts) available for this stay stage.',
          },
          fields: [
            {
              name: 'property',
              type: 'relationship',
              relationTo: 'accommodations',
              required: true,
              filterOptions: ({ data }): Where => {
                const originId =
                  data?.city && typeof data.city === 'object' && 'id' in data.city
                    ? (data.city as { id: number | string }).id
                    : data?.city
                const destIds = Array.isArray(data?.destinations)
                  ? data.destinations.map((d: unknown) =>
                      d && typeof d === 'object' && 'id' in d
                        ? (d as { id: number | string }).id
                        : d,
                    )
                  : []
                const allCityIds = [originId, ...destIds]
                  .map((id) => Number(id))
                  .filter((id) => !isNaN(id) && id > 0)

                if (allCityIds.length === 0) {
                  return { id: { equals: 0 } }
                }

                return {
                  and: [{ isActive: { equals: true } }, { city: { in: allCityIds } }],
                }
              },
              admin: {
                description: 'Reusable Accommodation Property entity from catalog.',
              },
            },
            {
              name: 'isDefault',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Designate this option as the authoritative default accommodation for this stay.',
              },
            },
            {
              name: 'roomCategory',
              type: 'text',
              admin: {
                description:
                  'Optional package-specific room category (e.g. Deluxe Nile View Room, Luxury Suite).',
              },
            },
            {
              name: 'boardBasis',
              type: 'select',
              options: [
                { label: 'Bed & Breakfast (BB)', value: 'bed_and_breakfast' },
                { label: 'Half Board (HB)', value: 'half_board' },
                { label: 'Full Board (FB)', value: 'full_board' },
                { label: 'All Inclusive (AI)', value: 'all_inclusive' },
              ],
            },
            {
              name: 'pricingUnit',
              type: 'select',
              required: true,
              defaultValue: 'per_stay',
              options: [
                {
                  label: 'Per Stay (Fixed room rate for the entire stay duration)',
                  value: 'per_stay',
                },
                { label: 'Per Night (Room rate multiplied by stay nights)', value: 'per_night' },
              ],
              admin: {
                description: 'Commercial pricing calculation unit for room rates in this option.',
              },
            },
            {
              name: 'roomRates',
              type: 'array',
              required: true,
              minRows: 1,
              admin: {
                description:
                  'Explicit commercial room rates and availability flags per occupancy type for this accommodation option.',
              },
              fields: [
                {
                  name: 'occupancy',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Single Occupancy (1 Guest)', value: 'single' },
                    { label: 'Double Occupancy (2 Guests)', value: 'double' },
                    { label: 'Triple Occupancy (3 Guests)', value: 'triple' },
                    { label: 'Quad Occupancy (4 Guests)', value: 'quad' },
                  ],
                },
                {
                  name: 'rateEGP',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: {
                    description:
                      'Commercial room price in EGP for this stay (or per night if pricingUnit is per_night). Set 0 only if complimentary/bundled.',
                  },
                },
                {
                  name: 'enabled',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    description:
                      'Enable to offer this occupancy type for booking. Uncheck to disable and prevent reservation.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'childPolicy',
      type: 'group',
      admin: {
        description:
          'Commercial child and infant pricing configuration (controlled by Administration).',
        condition: (data) => data?.type === 'package',
      },
      fields: [
        {
          name: 'childrenAllowed',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Are children allowed on this package experience?',
          },
        },
        {
          name: 'childSharingBedPercentage',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 50,
          admin: {
            description:
              'Price percentage for child (2-11 yrs) sharing parents bed (e.g. 50 = 50% of adult base price).',
          },
        },
        {
          name: 'childExtraBedPercentage',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 75,
          admin: {
            description:
              'Price percentage for child (2-11 yrs) requiring an extra rollaway bed (e.g. 75 = 75% of adult base price).',
          },
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
        condition: (data: Partial<Experience>) =>
          data?.type === 'package' && (!data?.packageMode || data?.packageMode === 'fixed_date'),
        components: {
          Field: '@/components/admin/DepartureSlotsEditor#DepartureSlotsEditor',
        },
      },
    },
  ],
}
