import type { CollectionConfig } from 'payload'
import { rateRegistry } from '@/domains/currency/rate-registry'
import { EXCHANGE_RATE_SOURCES } from '@/domains/currency/types'
import { EventBus } from '@/domains/events/event-bus'
import { CacheInvalidationCoordinator } from '@/domains/events/coordination/cache-coordinator'

export const ExchangeRates: CollectionConfig = {
  slug: 'exchange-rates',
  admin: {
    useAsTitle: 'toCurrency',
    defaultColumns: ['fromCurrency', 'toCurrency', 'rate', 'source', 'syncStatus', 'lastUpdate'],
    description: 'Live Financial Data for Exchange Rates',
    components: {
      beforeListTable: [
        '@/components/admin/SyncExchangeRatesButton#SyncExchangeRatesButton',
      ],
    },
  },
  access: {
    read: () => true, // Publicly readable for conversion
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        rateRegistry.invalidate()

        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CURRENCY_RATES_UPDATED',
          eventId: `evt_rate_${doc.id}_${Date.now()}`,
          correlationId: `corr_rate_${doc.id}`,
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
            '[ExchangeRates Hook] Distributed currency cache invalidation failed:',
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        rateRegistry.invalidate()

        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'CURRENCY_RATES_UPDATED',
          eventId: `evt_rate_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_rate_del_${doc.id}`,
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
            '[ExchangeRates Hook] Distributed currency cache invalidation on delete failed:',
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'fromCurrency',
      type: 'text',
      required: true,
      defaultValue: 'EGP',
      index: true,
      admin: {
        description: 'Base currency ISO code (e.g. EGP)',
      },
    },
    {
      name: 'toCurrency',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Target currency ISO code (e.g. USD)',
      },
    },
    {
      name: 'rate',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Exchange rate from base currency',
      },
    },
    {
      name: 'source',
      type: 'select',
      options: Object.values(EXCHANGE_RATE_SOURCES).map((val) => ({
        label: val,
        value: val,
      })),
      defaultValue: EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE,
      required: true,
    },
    {
      name: 'lastUpdate',
      type: 'date',
      admin: {
        description: 'Actual timestamp the rate was fetched/changed',
      },
    },
    {
      type: 'collapsible',
      label: 'Sync Diagnostics',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'lastSuccess',
          type: 'date',
          admin: {
            description: 'Last time this rate was successfully synced',
            readOnly: true,
          }
        },
        {
          name: 'lastAttempt',
          type: 'date',
          admin: {
            description: 'Last time a sync was attempted (whether success or fail)',
            readOnly: true,
          }
        },
        {
          name: 'lastError',
          type: 'text',
          admin: {
            description: 'Reason for the last sync failure (e.g. Timeout)',
            readOnly: true,
          }
        },
      ]
    },
    {
      name: 'syncStatus',
      type: 'select',
      options: [
        { label: 'Synced', value: 'synced' },
        { label: 'Failed', value: 'failed' },
        { label: 'Stale', value: 'stale' },
      ],
      defaultValue: 'synced',
      admin: {
        position: 'sidebar',
      }
    },
  ],
  timestamps: true, // Payload createdAt/updatedAt
}
