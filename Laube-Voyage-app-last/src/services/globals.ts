import 'server-only'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import type { HomePage, AboutPageConfig, CompanySetting } from '@/payload-types'

export const getHomePageConfig = cached(
  async (): Promise<HomePage | null> => {
    try {
      const payload = await getPayload({ config })
      const settings = (await payload.findGlobal({
        slug: 'home-page',
        depth: 2,
      })) as HomePage
      return settings || null
    } catch (error) {
      console.error('[Globals] Failed to load home-page settings:', error)
      return null
    }
  },
  ['global-home-page'],
  { tags: [CACHE_TAGS.home] }
)

export const getCompanySettings = cached(
  async (): Promise<CompanySetting | null> => {
    try {
      const payload = await getPayload({ config })
      const settings = (await payload.findGlobal({
        slug: 'company-settings',
        depth: 1,
      })) as CompanySetting
      return settings || null
    } catch (error) {
      console.error('[Globals] Failed to load company-settings:', error)
      return null
    }
  },
  ['global-company-settings'],
  { tags: [CACHE_TAGS.company] }
)

export const getAboutPageConfig = cached(
  async (): Promise<AboutPageConfig | null> => {
    try {
      const payload = await getPayload({ config })
      const settings = (await payload.findGlobal({
        slug: 'about-page-config',
        depth: 2,
      })) as AboutPageConfig
      return settings || null
    } catch (error) {
      console.error('[Globals] Failed to load about-page-config:', error)
      return null
    }
  },
  ['global-about-page-config'],
  { tags: [CACHE_TAGS.company] }
)
