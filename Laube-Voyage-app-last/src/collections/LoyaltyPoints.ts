import { CollectionConfig, Payload } from 'payload'
import { adminOrUserField, isAdmin } from '../access'

// Helper function to recalculate and sync user points
const syncUserBalance = async (userId: string | number, payload: Payload) => {
  try {
    const allPoints = await payload.find({
      collection: 'loyalty-points',
      where: { user: { equals: userId } },
      limit: 1000,
      depth: 0,
    })

    const newTotal = allPoints.docs.reduce((sum, doc) => sum + (doc.points || 0), 0)

    await payload.update({
      collection: 'users',
      id: userId,
      data: { loyaltyPoints: Math.max(0, newTotal) },
      overrideAccess: true,
      context: { skipPointsLogging: true },
    })
    console.log(`[LoyaltyPoints Sync] ✅ User ${userId} balance synced to ${Math.max(0, newTotal)}`)
  } catch (error) {
    console.error('[LoyaltyPoints Sync] Error syncing balance for user:', userId, error)
  }
}

export const LoyaltyPoints: CollectionConfig = {
  slug: 'loyalty-points',
  access: {
    read: adminOrUserField,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'id',
    group: 'Management',
    defaultColumns: ['user', 'points', 'type', 'reason', 'createdAt'],
  },
  hooks: {
    afterChange: [
      ({ doc, req }) => {
        const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
        if (userId) {
          const p = req.payload
          // setImmediate runs after the current PostgreSQL transaction commits
          setImmediate(() => {
            syncUserBalance(userId, p).catch((err) =>
              console.error('[LoyaltyPoints Sync] afterChange error:', err),
            )
          })
        }
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
        if (userId) {
          const p = req.payload
          setImmediate(() => {
            syncUserBalance(userId, p).catch((err) =>
              console.error('[LoyaltyPoints Sync] afterDelete error:', err),
            )
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'points',
      type: 'number',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Earned', value: 'earned' },
        { label: 'Redeemed', value: 'redeemed' },
        { label: 'Admin Adjustment', value: 'admin' },
      ],
      required: true,
    },
    {
      name: 'reason',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'e.g. Trip to Rome, Survey Bonus, Welcome Points',
      }
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      admin: {
        condition: (data) => data.type === 'earned',
      }
    }
  ],
}
