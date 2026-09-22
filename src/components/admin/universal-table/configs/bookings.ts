import type { CollectionPresentationConfig } from '../types'

/**
 * Presentation-Only Metadata for Bookings Collection.
 * Does NOT own the columns or the defaults (Payload useTableColumns owns them).
 * Dictates only HOW a field is visually rendered when active in Payload.
 */
export const bookingsPresentation: CollectionPresentationConfig = {
  collectionSlug: 'bookings',
  title: 'Bookings',
  description: 'Manage guest reservations, operational review, payments, and itinerary lifecycles',
  overrides: {
    bookingNumber: {
      header: 'Booking #',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'text',
    },
    user: {
      header: 'Customer',
      width: 200,
      minWidth: 160,
      resizable: true,
      sortable: false,
      cellType: 'title',
    },
    experience: {
      header: 'Experience',
      width: 260,
      minWidth: 200,
      resizable: true,
      sortable: false,
      cellType: 'title',
    },
    status: {
      header: 'Status',
      width: 170,
      minWidth: 130,
      resizable: true,
      sortable: true,
      cellType: 'badge',
    },
    startDate: {
      header: 'Departure',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    endDate: {
      header: 'Return',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    'pricingSnapshot.totalAmountEGP': {
      header: 'Total (EGP)',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'price',
    },
    amountPaid: {
      header: 'Paid',
      width: 130,
      minWidth: 110,
      resizable: true,
      sortable: true,
      cellType: 'price',
    },
    outstandingBalance: {
      header: 'Balance Due',
      width: 130,
      minWidth: 110,
      resizable: true,
      sortable: true,
      cellType: 'price',
    },
    createdAt: {
      header: 'Booked On',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    updatedAt: {
      header: 'Last Updated',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    completionAt: {
      header: 'Completed On',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      cellType: 'date',
    },
    id: {
      header: 'ID',
      width: 120,
      minWidth: 90,
      resizable: true,
      sortable: false,
      cellType: 'text',
    },
  },
  toolbar: {
    searchPlaceholder: 'Search by booking #, customer, experience...',
    searchFields: ['bookingNumber', 'userEmail'],
    capabilities: {
      search: true,
      quickFilters: true,
      columns: true,
      advancedFilters: true,
      reset: true,
    },
    quickFilters: [
      {
        id: 'status',
        field: 'status',
        label: 'Status',
        source: {
          type: 'static',
          options: [
            { label: 'Pending Admin Review', value: 'pending_admin_review' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Pending Payment', value: 'pending_payment' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Refunded', value: 'refunded' },
          ],
        },
        operator: 'equals',
      },
    ],
  },
  capabilities: {
    selection: true,
    bulkActions: false,
    metrics: true,
  },
}
