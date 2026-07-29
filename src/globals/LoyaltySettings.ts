import type { GlobalConfig } from 'payload'
import { afterLoyaltySettingsChange } from './hooks/afterLoyaltySettingsChange'

export const LoyaltySettings: GlobalConfig = {
  slug: 'loyalty-settings',
  admin: {
    group: 'Loyalty',
    description: 'Single Source of Truth for Loyalty Program Business Policy Configuration',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) =>
      !!(user && 'role' in user && (user.role === 'admin' || user.role === 'super_admin')),
  },
  fields: [
    // ---------------------------------------------------------
    // SIDEBAR GOVERNANCE FIELDS
    // ---------------------------------------------------------
    {
      name: 'version',
      label: 'Program Rules Version',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        description: 'Sequential version number stored in point ledger metadata for historical auditing',
      },
    },
    {
      name: 'programCode',
      label: 'Program Code',
      type: 'text',
      required: true,
      defaultValue: 'LAUBE_LOYALTY',
      admin: {
        position: 'sidebar',
        description: 'Core system loyalty program identifier (e.g., LAUBE_LOYALTY)',
      },
    },
    {
      name: 'name',
      label: 'Program Title',
      type: 'text',
      required: true,
      defaultValue: 'L\'Aube Voyage Loyalty Program',
      admin: {
        position: 'sidebar',
        description: 'Human-readable title displayed in customer portal',
      },
    },

    // ---------------------------------------------------------
    // MAIN CONFIGURATION TABS
    // ---------------------------------------------------------
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Earning & Wallet Redemption',
          description: 'Base EGP earn rates and flexible wallet points discount policies',
          fields: [
            {
              name: 'baseEarnRate',
              label: 'Base Earn Rate (Points per 1 EGP)',
              type: 'number',
              required: true,
              defaultValue: 1,
              admin: {
                description: 'Standard loyalty points earned per 1 EGP base spend',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'redemptionPointsUnit',
                  label: 'Redemption Points Unit',
                  type: 'number',
                  required: true,
                  defaultValue: 100,
                  admin: {
                    description: 'Number of points per discount unit (e.g., 100 points)',
                  },
                },
                {
                  name: 'redemptionValueEGP',
                  label: 'Redemption Value in EGP',
                  type: 'number',
                  required: true,
                  defaultValue: 10,
                  admin: {
                    description: 'EGP monetary discount value per points unit (e.g., 10 EGP per 100 points)',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'minRedemptionPoints',
                  label: 'Minimum Points Threshold',
                  type: 'number',
                  required: true,
                  defaultValue: 50,
                  admin: {
                    description: 'Minimum points balance required before customer can redeem',
                  },
                },
                {
                  name: 'redemptionStepUnit',
                  label: 'Redemption Step Unit',
                  type: 'number',
                  defaultValue: 50,
                  admin: {
                    description: 'Forces redemption points to be multiples of this step (e.g. 50 points)',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'maxRedemptionPercent',
                  label: 'Maximum Redemption Percentage (%)',
                  type: 'number',
                  required: true,
                  defaultValue: 80,
                  admin: {
                    description: 'Maximum percentage of total booking EGP payable via points (e.g. 80%)',
                  },
                },
                {
                  name: 'maxRedemptionFixedEGP',
                  label: 'Maximum Redemption Limit (EGP)',
                  type: 'number',
                  defaultValue: 5000,
                  admin: {
                    description: 'Optional absolute upper limit in EGP discount per booking (e.g., 5000 EGP)',
                  },
                },
              ],
            },
            {
              name: 'allowPartialRedemption',
              label: 'Allow Partial Wallet Redemption',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'If checked, customer can choose any custom point amount up to limit',
              },
            },
          ],
        },
        {
          label: 'Bonuses & Expiration',
          description: 'Customer registration bonus and rolling point validity window',
          fields: [
            {
              name: 'welcomeBonus',
              label: 'Welcome Registration Bonus Points',
              type: 'number',
              required: true,
              defaultValue: 100,
              admin: {
                description: 'Loyalty points granted upon new customer account creation',
              },
            },
            {
              name: 'expirationMonths',
              label: 'Point Expiration Period (Months)',
              type: 'number',
              required: true,
              defaultValue: 12,
              admin: {
                description: 'Rolling validity period for earned points in months (e.g. 12 months)',
              },
            },
            {
              name: 'bonusNeverExpires',
              label: 'Bonus Points Exempt from Expiration',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'Welcome and Tier Upgrade bonuses do not expire under rolling expiration',
              },
            },
          ],
        },
        {
          label: 'Tier Rules Matrix',
          description: 'Tier spend thresholds, earn multipliers, and advancement bonuses',
          fields: [
            {
              name: 'tiers',
              label: 'Tier Definitions',
              type: 'array',
              required: true,
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'tier',
                      label: 'Tier Level',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Explorer', value: 'explorer' },
                        { label: 'Voyager', value: 'voyager' },
                        { label: 'Elite', value: 'elite' },
                      ],
                    },
                    {
                      name: 'minSpentEGP',
                      label: 'Min Spend (EGP)',
                      type: 'number',
                      required: true,
                    },
                    {
                      name: 'earnMultiplier',
                      label: 'Earn Multiplier',
                      type: 'number',
                      required: true,
                    },
                    {
                      name: 'upgradeBonus',
                      label: 'Upgrade Bonus',
                      type: 'number',
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [afterLoyaltySettingsChange],
  },
}
