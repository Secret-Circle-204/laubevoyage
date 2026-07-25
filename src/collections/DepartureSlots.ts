import type { CollectionConfig } from 'payload'

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
      name: 'basePriceEGP',
      type: 'number',
      admin: {
        description: 'Optional price override in EGP for this slot. Falls back to Experience catalog price if left blank.',
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
