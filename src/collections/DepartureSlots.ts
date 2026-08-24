import type { CollectionConfig } from 'payload'
import { DepartureSlotHelper } from '@/domains/experience/departure-slot'
import { ExperienceRepository } from '@/domains/experience/repository'

export const DepartureSlots: CollectionConfig = {
  slug: 'departure-slots',
  admin: {
    useAsTitle: 'departureId',
    defaultColumns: ['departureId', 'experience', 'date', 'capacityAvailable', 'status'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (!data || data.status === 'cancelled') return data
        const expId = data.experience ? (typeof data.experience === 'object' ? Number(data.experience.id) : Number(data.experience)) : 0
        if (!expId || !data.date) return data

        const expDoc = await req.payload.findByID({
          collection: 'experiences',
          id: expId,
          depth: 0,
          req,
        })

        if (expDoc && expDoc.type === 'package') {
          const cityId = expDoc.city ? (typeof expDoc.city === 'object' ? Number(expDoc.city.id) : Number(expDoc.city)) : 0
          if (!cityId) {
            throw new Error(`[DepartureSlots] Experience #${expId} is missing required city.`)
          }
          const repository = new ExperienceRepository(req.payload)
          const destinationTimezone = await repository.findTimezoneByCityId(cityId, req)

          const durationDays = expDoc.duration && typeof expDoc.duration === 'object' && expDoc.duration.days
            ? Number(expDoc.duration.days)
            : null
          if (!durationDays || isNaN(durationDays) || durationDays < 1) {
            throw new Error(`[DepartureSlots] Package Experience #${expId} is missing authoritative duration.days >= 1.`)
          }

          const slotDate = new Date(data.date).toISOString().split('T')[0]
          DepartureSlotHelper.calculateTemporalBoundary({
            date: slotDate,
            startTime: data.startTime || undefined,
            durationDays,
            destinationTimezone,
          })
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'departureId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'experience',
      type: 'relationship',
      relationTo: 'experiences',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'startTime',
      type: 'text',
      defaultValue: '09:00',
    },
    {
      name: 'priceOverrideEGP',
      type: 'number',
      admin: {
        description: 'Optional price override in EGP for this slot. Inherits Experience.price if left blank.',
      },
    },
    {
      name: 'capacityTotal',
      type: 'number',
      required: true,
      defaultValue: 20,
    },
    {
      name: 'capacityReserved',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'capacitySold',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'capacityAvailable',
      type: 'number',
      required: true,
      defaultValue: 20,
    },
    {
      name: 'version',
      type: 'number',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'available',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Sold Out', value: 'sold_out' },
        { label: 'Blacked Out', value: 'blacked_out' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}
