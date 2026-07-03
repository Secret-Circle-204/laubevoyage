import type { Payload, NavPreferences } from 'payload'
import { cache } from 'react'
import { User } from '@/payload-types'

export const getNavPrefs = cache(
  async ({ payload, user }: { payload: Payload; user?: User }): Promise<NavPreferences | null> =>
    user
      ? await payload
          .find({
            collection: 'payload-preferences',
            depth: 0,
            limit: 1,
            user,
            where: {
              and: [
                {
                  key: {
                    equals: 'nav',
                  },
                },
                {
                  'user.relationTo': {
                    equals: 'users',
                  },
                },
                {
                  'user.value': {
                    equals: user.id,
                  },
                },
              ],
            },
          })
          ?.then((res) => (res?.docs?.[0]?.value as NavPreferences) || null)
      : null,
)
