import { CollectionConfig } from 'payload'
import { adminOnly } from '../access'

export const ContactInquiries: CollectionConfig = {
  slug: 'contact-inquiries',
  access: adminOnly,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'subject', 'status', 'createdAt'],
    listSearchableFields: ['name', 'email', 'message'],
    group: 'Management',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        placeholder: '+20 xxx xxx xxxx',
      },
    },
    {
      name: 'subject',
      type: 'select',
      required: true,
      options: [
        { label: 'New Booking Inquiry', value: 'booking' },
        { label: 'Existing Reservation', value: 'reservation' },
        { label: 'Loyalty Program Question', value: 'loyalty' },
        { label: 'General Feedback', value: 'feedback' },
        { label: 'Partnership Opportunity', value: 'partnership' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'preferredTravelDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Optional - for booking inquiries',
      },
    },
    {
      name: 'destination',
      type: 'text',
      admin: {
        placeholder: 'e.g. Rome, Dubai, Local Egypt Tour',
      },
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Minimum 50 characters',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Responded', value: 'responded' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        description: 'Internal use only',
      },
    },
  ],
}
