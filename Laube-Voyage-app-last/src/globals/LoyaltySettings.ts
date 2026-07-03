import type { GlobalConfig } from 'payload'
import { revalidateCollection } from '../utilities/revalidate'

export const LoyaltySettings: GlobalConfig = {
  slug: 'loyalty-settings',
  label: 'Loyalty Program Settings',
  admin: {
    group: 'Settings',
    description: 'Configure loyalty points earning rates, redemption tiers, and membership levels.',
  },
  hooks: {
    afterChange: [() => revalidateCollection('company')],
  },
  access: {
    read: () => true, // Everyone can read (frontend needs it)
    update: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
  },
  fields: [
    // ── Earning Configuration ──
    {
      type: 'group',
      name: 'earning',
      label: 'Points Earning',
      admin: {
        description: 'How customers earn points from bookings.',
      },
      fields: [
        {
          name: 'pointsPerDollar',
          type: 'number',
          required: true,
          defaultValue: 0.1,
          min: 0,
          admin: {
            description: 'Points earned per $1 spent. Example: 0.1 = 1 point per $10 spent.',
            step: 0.01,
          },
        },
        {
          name: 'explorerMultiplier',
          type: 'number',
          required: true,
          defaultValue: 1.2,
          min: 1,
          admin: {
            description: 'Explorer tier bonus multiplier (e.g., 1.2 = 20% bonus points).',
            step: 0.1,
          },
        },
        {
          name: 'voyagerMultiplier',
          type: 'number',
          required: true,
          defaultValue: 1.5,
          min: 1,
          admin: {
            description: 'Voyager tier bonus multiplier (e.g., 1.5 = 50% bonus points).',
            step: 0.1,
          },
        },
      ],
    },

    // ── Tier Thresholds ──
    {
      type: 'group',
      name: 'tiers',
      label: 'Tier Thresholds',
      admin: {
        description: 'How much total spend is needed to reach each tier.',
      },
      fields: [
        {
          name: 'explorerThreshold',
          type: 'number',
          required: true,
          defaultValue: 5000,
          min: 0,
          admin: {
            description: 'Minimum total spend ($) for Explorer tier.',
          },
        },
        {
          name: 'voyagerThreshold',
          type: 'number',
          required: true,
          defaultValue: 15000,
          min: 0,
          admin: {
            description: 'Minimum total spend ($) for Voyager tier.',
          },
        },
      ],
    },

    // ── Redemption Tiers ──
    {
      name: 'redemptionTiers',
      type: 'array',
      label: 'Redemption Tiers',
      required: true,
      minRows: 1,
      admin: {
        description:
          'Define how many points customers can redeem and what discount they receive. These appear at checkout and in the dashboard.',
      },
      defaultValue: [
        { points: 500, discountValue: 25 },
        { points: 1000, discountValue: 55 },
        { points: 2000, discountValue: 120 },
        { points: 5000, discountValue: 350 },
      ],
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'points',
              type: 'number',
              required: true,
              min: 1,
              admin: {
                description: 'Number of points to redeem.',
                width: '50%',
              },
            },
            {
              name: 'discountValue',
              type: 'number',
              required: true,
              min: 1,
              admin: {
                description: 'Discount value ($) given for these points.',
                width: '50%',
              },
            },
          ],
        },
      ],
    },
  ],
}
