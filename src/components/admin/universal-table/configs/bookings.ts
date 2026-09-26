import type { CollectionPresentationConfig } from '../types'
import { CalendarDateCell } from '@/components/admin/CalendarDateCell'
import { OperationalCompletionCell } from '@/components/admin/OperationalCompletionCell'

/**
 * Presentation-Only Metadata for Bookings Collection.
 * Does NOT own the columns or the defaults (Payload useTableColumns owns them).
 * Dictates only HOW a field is visually rendered when active in Payload.
 */
export const bookingsPresentation: CollectionPresentationConfig = {
  collectionSlug: 'bookings',
  title: 'Bookings',
  description: 'Manage guest reservations, operational review, payments, and itinerary lifecycles',
  peekWidth: 'wide',
  peekDepth: 2,
  titleField: 'bookingNumber',
  subtitleField: (doc) => {
    const user = typeof doc?.user === 'object' && doc?.user !== null ? (doc.user as Record<string, unknown>) : null
    const customer =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      (typeof user?.name === 'string' ? user.name : null) ||
      (typeof doc?.userEmail === 'string' ? doc.userEmail : null) ||
      null

    const exp = typeof doc?.experience === 'object' && doc?.experience !== null ? (doc.experience as Record<string, unknown>) : null
    const experience = typeof exp?.title === 'string' ? exp.title : null
    const parts = [customer, experience].filter(Boolean)
    return parts.length > 0 ? parts.join(' • ') : null
  },
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
      cellType: 'relationship',
    },
    experience: {
      header: 'Experience',
      width: 260,
      minWidth: 200,
      resizable: true,
      sortable: false,
      cellType: 'relationship',
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
      customCell: CalendarDateCell,
    },
    endDate: {
      header: 'Return',
      width: 140,
      minWidth: 120,
      resizable: true,
      sortable: true,
      customCell: CalendarDateCell,
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
      width: 170,
      minWidth: 150,
      resizable: true,
      sortable: true,
      customCell: OperationalCompletionCell,
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
        label: 'Lifecycle',
        source: {
          type: 'static',
          options: [
            { label: 'Pending Admin Review', value: 'pending_admin_review' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Refunded', value: 'refunded' },
          ],
        },
        operator: 'equals',
      },
      {
        id: 'paymentStatus',
        field: 'paymentStatus',
        label: 'Payment',
        source: {
          type: 'static',
          options: [
            {
              label: 'Outstanding Balance',
              value: 'outstanding',
              whereCondition: { in: ['unpaid', 'partially_paid'] },
            },
            {
              label: 'Fully Paid',
              value: 'paid',
              whereCondition: { equals: 'paid' },
            },
          ],
        },
      },
    ],
  },
  capabilities: {
    selection: true,
    bulkActions: true,
    bulkEdit: false,
    metrics: true,
  },
  metrics: [
    {
      id: 'total',
      label: 'Total Bookings',
      icon: 'bag',
    },
    {
      id: 'pending_review',
      label: 'Pending Review',
      icon: 'alert',
      variant: 'warning',
      where: { status: { equals: 'pending_admin_review' } },
      calculatePercentageOfTotal: true,
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      icon: 'check',
      variant: 'success',
      where: { status: { equals: 'confirmed' } },
      calculatePercentageOfTotal: true,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      icon: 'creditCard',
      variant: 'info',
      where: { paymentStatus: { in: ['unpaid', 'partially_paid'] } },
      calculatePercentageOfTotal: true,
    },
  ],
  peekSections: [
    {
      id: 'cockpit',
      title: 'Booking Cockpit',
      fields: [],
      customSlot: 'bookingCockpit',
    },
  ],
}
