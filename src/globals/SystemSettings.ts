import type { GlobalConfig } from 'payload'
import { afterSystemSettingsChange } from './hooks/afterSystemSettingsChange'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  admin: {
    group: 'System',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'vatRate',
      label: 'VAT Rate (%)',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Standard VAT percentage (e.g. 14 for 14%)',
      },
    },
    {
      name: 'pricesIncludeVat',
      label: 'Prices Include VAT',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Are experience base catalog prices inclusive of VAT?',
      },
    },
    {
      name: 'vatEnabled',
      label: 'VAT Enabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Toggle standard VAT calculation on/off in pricing calculations',
      },
    },
    {
      name: 'baseCurrency',
      label: 'Base Currency',
      type: 'relationship',
      relationTo: 'currencies',
      required: true,
      admin: {
        readOnly: true,
        description: 'Core system base currency (Locked to EGP)',
      },
    },
    {
      name: 'defaultDisplayCurrency',
      label: 'Default Display Currency',
      type: 'relationship',
      relationTo: 'currencies',
      required: true,
      admin: {
        description: 'Default currency to display to users (e.g., EGP)',
      },
    },
    {
      name: 'autoSyncExchangeRates',
      label: 'Auto Sync Exchange Rates',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'exchangeSyncInterval',
      label: 'Exchange Sync Interval (Minutes)',
      type: 'number',
      defaultValue: 60,
      admin: {
        description: 'Frequency of exchange rate synchronization (used by Cron/Scheduler, not by Pipeline)',
      },
    },
    {
      name: 'exchangeRateCacheTtl',
      label: 'Exchange Rate Cache TTL (Minutes)',
      type: 'number',
      defaultValue: 15,
    },
    {
      name: 'bookingNotificationEmails',
      label: 'Booking Notification Recipients',
      type: 'array',
      admin: {
        description: 'Designated operational email addresses to receive new booking requests and BNPL review alerts',
      },
      fields: [
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
        },
      ],
    },
    {
      name: 'emailSenderSettings',
      label: 'Email Sender Identities (Business Configuration)',
      type: 'group',
      admin: {
        description: 'Configure official sender identities and reply-to destinations for business communication channels.',
      },
      fields: [
        {
          name: 'reservationIdentity',
          label: 'Reservation & Booking Identity',
          type: 'group',
          fields: [
            {
              name: 'fromName',
              label: 'Display Name',
              type: 'text',
              required: true,
            },
            {
              name: 'fromEmail',
              label: 'Sender Email Address',
              type: 'email',
              required: true,
            },
            {
              name: 'replyTo',
              label: 'Reply-To Email Address',
              type: 'email',
              required: true,
            },
          ],
        },
        {
          name: 'loyaltyIdentity',
          label: 'Loyalty & Rewards Identity',
          type: 'group',
          fields: [
            {
              name: 'fromName',
              label: 'Display Name',
              type: 'text',
              required: true,
            },
            {
              name: 'fromEmail',
              label: 'Sender Email Address',
              type: 'email',
              required: true,
            },
            {
              name: 'replyTo',
              label: 'Reply-To Email Address',
              type: 'email',
              required: true,
            },
          ],
        },
        {
          name: 'securityIdentity',
          label: 'Security & Verification Identity (TBD / Optional)',
          type: 'group',
          fields: [
            {
              name: 'fromName',
              label: 'Display Name',
              type: 'text',
              required: false,
            },
            {
              name: 'fromEmail',
              label: 'Sender Email Address',
              type: 'email',
              required: false,
            },
            {
              name: 'replyTo',
              label: 'Reply-To Email Address',
              type: 'email',
              required: false,
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [afterSystemSettingsChange],
  },
}
