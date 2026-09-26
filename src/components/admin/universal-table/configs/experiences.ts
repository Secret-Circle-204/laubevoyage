import type { CollectionPresentationConfig } from '../types'

/**
 * Presentation-Only Metadata for Experiences Collection.
 * Does NOT own the columns or the defaults (Payload useTableColumns owns them).
 * Dictates only HOW a field is visually rendered when active in Payload.
 */
export const experiencesPresentation: CollectionPresentationConfig = {
  collectionSlug: 'experiences',
  title: 'Experiences',
  description: 'Curate bespoke travel itineraries, departures and tour packages',
  heroField: 'hero',
  previewUrlTemplate: '/experiences/{slug}',
  overrides: {
    hero: {
      header: 'Image',
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      resizable: false,
      sortable: false,
      cellType: 'thumbnail',
    },
    thumbnail: {
      header: 'Image',
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      resizable: false,
      sortable: false,
      cellType: 'thumbnail',
    },
    title: {
      header: 'Title',
      width: 280,
      minWidth: 220,
      resizable: true,
      sortable: true,
      cellType: 'title',
    },
    city: {
      header: 'City',
      width: 140,
      minWidth: 100,
      resizable: true,
      sortable: false,
      cellType: 'location',
    },
    type: {
      header: 'Type',
      width: 125,
      minWidth: 100,
      resizable: true,
      sortable: true,
      cellType: 'badge',
    },
    price: {
      header: 'Price',
      width: 145,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'price',
    },
    availability: {
      header: 'Availability',
      width: 135,
      minWidth: 110,
      resizable: true,
      sortable: true,
      cellType: 'badge',
    },
    updatedAt: {
      header: 'Updated At',
      width: 145,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    createdAt: {
      header: 'Created At',
      width: 145,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    id: {
      header: 'ID',
      width: 160,
      minWidth: 120,
      resizable: true,
      sortable: false,
      cellType: 'text',
    },
    slug: {
      header: 'Slug',
      width: 180,
      minWidth: 140,
      resizable: true,
      sortable: true,
      cellType: 'text',
    },
    packageMode: {
      header: 'Package Mode',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'badge',
    },
    'duration.days': {
      header: 'Days',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      cellType: 'text',
    },
    'duration.nights': {
      header: 'Nights',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      cellType: 'text',
    },
    accommodations: {
      header: 'Accommodations',
      width: 170,
      minWidth: 140,
      resizable: true,
      sortable: false,
      cellType: 'accommodations',
      valueFormatter: (value: unknown) => {
        if (Array.isArray(value)) {
          const totalNts = value.reduce(
            (s: number, stay: Record<string, unknown>) => s + (Number(stay?.nights) || 0),
            0,
          )
          return `${value.length} Stays (${totalNts} nts)`
        }
        return ''
      },
    },
    itinerary: {
      header: 'Itinerary',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: false,
      cellType: 'itinerary',
      valueFormatter: (value: unknown) => (Array.isArray(value) ? `${value.length} Days` : ''),
    },
    gallery: {
      header: 'Gallery',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: false,
      cellType: 'gallery',
      valueFormatter: (value: unknown) => (Array.isArray(value) ? `${value.length} Photos` : ''),
    },
  },
  rowActions: [
    {
      id: 'edit',
      label: 'Edit Experience',
      hrefTemplate: '/admin/collections/experiences/{id}',
    },
    {
      id: 'preview',
      label: 'View on Site',
      hrefTemplate: '/experiences/{slug}',
    },
  ],
  capabilities: {
    selection: true,
    bulkActions: true,
    bulkEdit: true,
    metrics: true,
  },
  toolbar: {
    searchPlaceholder: 'Search by title or slug...',
    quickFilters: [
      {
        id: 'city',
        field: 'city',
        label: 'Cities',
        placeholder: 'All Cities',
        source: {
          type: 'relationship',
          relationTo: 'cities',
          labelField: 'name',
          valueField: 'id',
        },
      },
      {
        id: 'type',
        field: 'type',
        label: 'Types',
        placeholder: 'All Types',
        source: {
          type: 'static',
          options: [
            { label: 'Package', value: 'package' },
            { label: 'Daily Tour', value: 'daily_tour' },
          ],
        },
      },
      {
        id: 'availability',
        field: 'availability',
        label: 'Availability',
        placeholder: 'All Availability',
        source: {
          type: 'static',
          options: [
            { label: 'Available', value: 'available' },
            { label: 'Sold Out', value: 'sold_out' },
            { label: 'Coming Soon', value: 'coming_soon' },
            { label: 'Unavailable', value: 'unavailable' },
          ],
        },
      },
    ],
    capabilities: {
      search: true,
      quickFilters: true,
      columns: true,
      advancedFilters: true,
      reset: true,
    },
  },
  metrics: [
    {
      id: 'total',
      label: 'Total Experiences',
      icon: 'bag',
    },
    {
      id: 'available',
      label: 'Available',
      icon: 'check',
      variant: 'success',
      where: { availability: { equals: 'available' } },
      calculatePercentageOfTotal: true,
    },
    {
      id: 'packages',
      label: 'Packages',
      icon: 'layers',
      variant: 'info',
      where: { type: { equals: 'package' } },
      calculatePercentageOfTotal: true,
    },
    {
      id: 'daily_tours',
      label: 'Daily Tours',
      icon: 'pin',
      where: { type: { equals: 'daily_tour' } },
      calculatePercentageOfTotal: true,
    },
  ],
  peekSections: [
    {
      id: 'geographyItinerary',
      title: 'Geography & Itinerary',
      fields: [
        { field: 'city', label: 'Origin City', formatter: 'relation' },
        { field: 'destinations', label: 'Transit Destinations', formatter: 'arrayCount', unit: 'Stops' },
        { field: 'duration', label: 'Duration', formatter: 'duration' },
        { field: 'type', label: 'Type', formatter: 'status' },
        {
          field: 'packageMode',
          label: 'Package Mode',
          formatter: 'status',
          condition: (doc: Record<string, unknown>) => doc?.type === 'package',
        },
      ],
    },
    {
      id: 'commercialAvailability',
      title: 'Commercial & Availability',
      fields: [
        { field: 'price', label: 'Base Price', formatter: 'price' },
        { field: 'availability', label: 'Availability Status', formatter: 'status' },
      ],
    },
    {
      id: 'departureSlots',
      title: 'Departure Slots',
      fields: [],
      customSlot: 'departureSlots',
      condition: (doc: Record<string, unknown>) =>
        doc?.type === 'package' && (!doc?.packageMode || doc?.packageMode === 'fixed_date'),
    },
    {
      id: 'systemIdentifiers',
      title: 'System & Identifiers',
      fields: [
        { field: 'id', label: 'Document ID', isMono: true },
        { field: 'slug', label: 'Slug', isMono: true },
        { field: 'createdAt', label: 'Created Date', formatter: 'date' },
        { field: 'updatedAt', label: 'Last Updated', formatter: 'date' },
      ],
    },
  ],
}
