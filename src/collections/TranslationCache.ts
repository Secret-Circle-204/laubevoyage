import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'
import { CacheInvalidationCoordinator } from '@/domains/events/coordination/cache-coordinator'

export const TranslationCache: CollectionConfig = {
  slug: 'translation-cache',
  admin: {
    useAsTitle: 'sourceText',
    defaultColumns: ['originalHash', 'language', 'provider', 'version', 'expiresAt'],
    description: 'Persistent versioned cache for translated text segments with TTL',
  },
  access: {
    read: () => true,
    update: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // Skip eviction if mutation was triggered directly by TranslationEngine self-write
        if (req?.context?.isEngineWrite) {
          return doc
        }

        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'TRANSLATION_CACHE_MUTATED',
          eventId: `evt_trans_${doc.id}_${Date.now()}`,
          correlationId: `corr_trans_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          originalHash: doc.originalHash,
          language: doc.language,
        })

        // Broadcast cross-process NOTIFY to peer Node workers
        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({
            type: 'translation',
            hash: doc.originalHash,
            lang: doc.language,
          }, dbTx)
        } catch {}

        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'TRANSLATION_CACHE_MUTATED',
          eventId: `evt_trans_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_trans_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          originalHash: doc.originalHash,
          language: doc.language,
        })

        // Broadcast cross-process NOTIFY to peer Node workers
        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({
            type: 'translation',
            hash: doc.originalHash,
            lang: doc.language,
          }, dbTx)
        } catch {}

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['originalHash', 'language'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'originalHash',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'SHA-256 hash of the original English source text',
      },
    },
    {
      name: 'sourceText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'language',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Target locale code (e.g. ar, fr)',
      },
    },
    {
      name: 'translatedText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      admin: {
        description: 'Translation engine used (e.g. google, libre, deepl)',
      },
    },
    {
      name: 'version',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Source document version at the time of translation',
      },
    },
    {
      name: 'lastVerifiedAt',
      type: 'date',
      admin: {
        description: 'Last time this translation was verified against the source version/hash',
      },
    },
  ],
  timestamps: true,
}
