import { type CollectionConfig, APIError } from 'payload'
import { addPointsToUser, removePointsFromUser, refundRedeemedPoints } from '../services/loyalty'
import { getLoyaltyConfig, calculatePointsFromConfig } from '../services/loyaltyConfig'
import { sendEmail, getBookingConfirmationTemplate } from '../services/email'
import { adminOrUserField, authenticated, isAdmin } from '../access'

const getID = (field: number | { id: number } | null | undefined): number | undefined =>
  typeof field === 'object' && field !== null ? field.id : (field as number | undefined)

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  access: {
    read: adminOrUserField,
    create: authenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'user', 'package', 'status', 'totalPrice', 'createdAt'],
    listSearchableFields: ['id', 'status', 'notes'],
    group: 'Management',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'package',
      type: 'relationship',
      relationTo: 'packages',
      required: true,
    },
    {
      name: 'contactEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'Preferred email for booking communications',
      },
    },
    {
      name: 'contactPhone',
      type: 'text',
      required: true,
    },
    {
      name: 'bookingDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'travelersList',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'fullName',
              type: 'text',
              required: true,
              admin: { width: '40%' },
            },
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'adult',
              options: [
                { label: 'Adult', value: 'adult' },
                { label: 'Infant', value: 'infant' },
              ],
              admin: { width: '20%' },
            },
            {
              name: 'passportNumber',
              type: 'text',
              admin: { width: '40%' },
            },
          ],
        },
        {
          name: 'specialRequests',
          type: 'textarea',
          admin: {
            placeholder: 'Dietary requirements, medical needs, or special occasions...',
          },
        },
      ],
    },
    {
      name: 'selectedExcursions',
      type: 'relationship',
      relationTo: 'excursions',
      hasMany: true,
      admin: {
        description: 'Add-on experiences selected for this booking',
      },
    },
    {
      name: 'pointsRedeemed',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of loyalty points used to discount this booking',
        readOnly: true,
      },
    },
    {
      name: 'discountAmount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'The monetary value deducted from the subtotal using points',
        readOnly: true,
      },
    },
    {
      name: 'totalPrice',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'receipt',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        // Award loyalty points & Send Email when booking is marked as 'confirmed'
        if (
          operation === 'update' &&
          doc.status === 'confirmed' &&
          previousDoc?.status !== 'confirmed'
        ) {
          // Await this block to ensure execution completes in Serverless/VPS environments
          await (async () => {
            try {
              const payload = req.payload
              const userId = getID(doc.user)
              const pkgId = getID(doc.package)

              if (!userId || !pkgId) {
                console.warn('[Automation Skip] Missing User or Package ID for booking:', doc.id)
                return
              }

              // 1. Fetch User and Package for details
              const [user, pkg] = await Promise.all([
                payload.findByID({
                  collection: 'users',
                  id: userId,
                }),
                payload.findByID({
                  collection: 'packages',
                  id: pkgId,
                }),
              ])

              if (!user || !pkg) {
                console.warn(
                  '[Automation Skip] Could not find User or Package for booking:',
                  doc.id,
                )
                return
              }

              // 2. Award points (using admin-configured rates)
              const tier = user.loyaltyTier || 'traveler'
              const loyaltyConfig = await getLoyaltyConfig()
              const pointsEarned = calculatePointsFromConfig(doc.totalPrice, tier, loyaltyConfig)

              await addPointsToUser(payload, user.id, pointsEarned, doc.totalPrice, doc.id)

              // 3. Send Confirmation Email
              await sendEmail({
                to: doc.contactEmail || user.email,
                subject: `Confirmed: Your Journey to ${pkg.title}`,
                html: getBookingConfirmationTemplate({
                  name: user.name || user.email.split('@')[0],
                  packageTitle: pkg.title,
                  date: new Date(doc.bookingDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  totalPrice: doc.totalPrice,
                  pointsEarned: pointsEarned,
                }),
                fromType: 'reservation',
              })

              console.log(
                `[Automation Success] Loyalty awarded and Email sent for Booking ${doc.id}`,
              )
            } catch (error) {
              console.error('[Automation Error] Failed to complete post-confirmation tasks:', error)
            }
          })()
        } else if (
          operation === 'update' &&
          doc.status === 'cancelled' &&
          previousDoc?.status !== 'cancelled'
        ) {
          // 1. Revert EARNED points & Refund REDEEMED points (awaited for reliability)
          await (async () => {
            try {
              const userId = getID(doc.user)
              const bookingId = typeof doc.id === 'number' ? doc.id : parseInt(String(doc.id), 10)

              if (!userId || isNaN(bookingId)) return

              if (previousDoc?.status === 'confirmed' || previousDoc?.status === 'completed') {
                await removePointsFromUser(req.payload, userId, bookingId)
              }

              // 2. Refund REDEEMED (spent) points directly back to user
              if (doc.pointsRedeemed && doc.pointsRedeemed > 0) {
                await refundRedeemedPoints(req.payload, userId, bookingId, doc.pointsRedeemed)
              }
            } catch (error) {
              console.error('[Automation Error] Failed to process points on cancel:', error)
            }
          })()
        }
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        try {
          const booking = await req.payload.findByID({
            collection: 'bookings',
            id,
          })

          if (booking) {
            const userId = getID(booking.user)
            const bookingId = typeof id === 'number' ? id : parseInt(String(id), 10)

            if (userId && !isNaN(bookingId)) {
              if (booking.status === 'confirmed' || booking.status === 'completed') {
                await removePointsFromUser(req.payload, userId, bookingId)
              }
              if (booking.pointsRedeemed && booking.pointsRedeemed > 0) {
                await refundRedeemedPoints(req.payload, userId, bookingId, booking.pointsRedeemed)
              }
            }
          }
        } catch (error) {
          req.payload.logger.error(`[Booking Delete Error] Failed to reverse points: ${error}`)
          throw new APIError(
            'Failed to delete booking: Could not reverse loyalty points. Please contact support.',
            500,
          )
        }
      },
    ],
  },
}
