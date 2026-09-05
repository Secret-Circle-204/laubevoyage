import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'
import { CacheInvalidationCoordinator } from '@/domains/events/coordination/cache-coordinator'

export const Currencies: CollectionConfig = {
  slug: 'currencies',
  admin: {
    useAsTitle: 'isoCode',
    defaultColumns: ['isoCode', 'name', 'symbol', 'isActive', 'isDefault'],
    description: 'Master Catalog of Currencies (Identity only, no live rates)',
  },
  access: {
    read: () => true, // Publicly readable for active currencies
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CURRENCY_CATALOG_UPDATED',
          eventId: `evt_curr_${doc.id}_${Date.now()}`,
          correlationId: `corr_curr_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
        })

        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({ type: 'currency' }, dbTx)
        } catch (err: unknown) {
          console.warn(
            '[Currencies Hook] Distributed currency catalog cache invalidation failed:',
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CURRENCY_CATALOG_UPDATED',
          eventId: `evt_curr_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_curr_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
        })

        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({ type: 'currency' }, dbTx)
        } catch (err: unknown) {
          console.warn(
            '[Currencies Hook] Distributed currency catalog cache invalidation on delete failed:',
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'isoCode',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISO 4217 Currency Code (e.g., USD, EUR, JPY)',
      },
    },
    {
      name: 'numericCode',
      type: 'number',
      required: true,
      admin: {
        description: 'ISO 4217 Numeric Code (e.g., 840 for USD)',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Full name (e.g., US Dollar)',
      },
    },
    {
      name: 'symbol',
      type: 'text',
      required: true,
      admin: {
        description: 'Common symbol (e.g., $)',
      },
    },
    {
      name: 'nativeSymbol',
      type: 'text',
      admin: {
        description: 'Native symbol (e.g., US$)',
      },
    },
    {
      name: 'decimals',
      type: 'number',
      required: true,
      defaultValue: 2,
      admin: {
        description: 'Number of decimal places (e.g., 2 for USD, 0 for JPY)',
      },
    },

    {
      name: 'flagCode',
      type: 'text',
      admin: {
        description: 'Two-letter country code for flags (e.g., us, eu, eg, sa)',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Enable or disable this currency in the frontend',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
