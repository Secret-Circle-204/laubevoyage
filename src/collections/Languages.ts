import type { CollectionConfig } from 'payload'
import { EventBus } from '@/domains/events/event-bus'
import { CacheInvalidationCoordinator } from '@/domains/events/coordination/cache-coordinator'

export const Languages: CollectionConfig = {
  slug: 'languages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'nativeName', 'code', 'isActive', 'isDefault', 'displayOrder'],
    description: 'Master catalog of active and supported website languages.',
  },
  access: {
    read: () => true, // Publicly readable
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // 1. Guard against deactivating the active default language
        const isCurrentlyDefault = originalDoc?.isDefault ?? false
        const willBeDefault = data.isDefault !== undefined ? data.isDefault : isCurrentlyDefault
        const willBeActive = data.isActive !== undefined ? data.isActive : (originalDoc?.isActive ?? true)

        if (willBeDefault && !willBeActive) {
          throw new Error('Cannot deactivate the default language. Please assign another active language as default first.')
        }

        // 2. Single Default Guarantee: If setting this language as default, unset all others
        if (data.isDefault === true) {
          const currentDefaults = await req.payload.find({
            collection: 'languages',
            where: {
              isDefault: { equals: true },
            },
            limit: 100,
            req,
          })

          for (const doc of currentDefaults.docs) {
            if (String(doc.id) !== String(originalDoc?.id)) {
              await req.payload.update({
                collection: 'languages',
                id: doc.id,
                data: {
                  isDefault: false,
                },
                req,
              })
            }
          }
        }

        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const doc = await req.payload.findByID({
          collection: 'languages',
          id,
          req,
        })
        if (doc?.isDefault) {
          throw new Error('Cannot delete the default language. Please assign another active language as default first.')
        }
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const eventBus = EventBus.getInstance()
        await eventBus.publish({
          type: 'LANGUAGE_CATALOG_UPDATED',
          eventId: `evt_lang_${doc.id}_${Date.now()}`,
          correlationId: `corr_lang_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          languageCode: doc.code,
        })

        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({ type: 'language' }, dbTx)
        } catch (err: unknown) {
          console.warn(
            '[Languages Hook] Distributed language catalog cache invalidation failed:',
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
          type: 'LANGUAGE_CATALOG_UPDATED',
          eventId: `evt_lang_del_${doc.id}_${Date.now()}`,
          correlationId: `corr_lang_del_${doc.id}`,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          languageCode: doc.code,
        })

        try {
          const coordinator = CacheInvalidationCoordinator.getInstance(req?.payload)
          const txId = req?.transactionID ? await req.transactionID : undefined
          const dbTx = txId ? (req?.payload?.db as any)?.sessions?.[txId] : undefined
          await coordinator.publish({ type: 'language' }, dbTx)
        } catch (err: unknown) {
          console.warn(
            '[Languages Hook] Distributed language catalog cache invalidation on delete failed:',
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Administrative language name (e.g. English, Arabic)',
      },
    },
    {
      name: 'nativeName',
      type: 'text',
      required: true,
      admin: {
        description: 'Language name as shown in the UI switcher (e.g. English, العربية, Français)',
      },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISO language code (e.g. en, ar, fr)',
      },
    },
    {
      name: 'isRTL',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check if this language is read Right-to-Left (e.g. Arabic)',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Enable or disable this language site-wide',
      },
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set as the fallback language for the entire platform',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Order of appearance in the language switcher dropdown',
      },
    },
    {
      name: 'preferredDisplayCurrency',
      type: 'relationship',
      relationTo: 'currencies',
      admin: {
        description: 'The recommended display currency chosen for users browsing in this language (e.g. USD for English, EUR for German)',
      },
    },
  ],
  timestamps: true,
}
