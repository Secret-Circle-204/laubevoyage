import 'server-only'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { Excursion } from '../payload-types'

export const getAllExcursions = cached(
  async (): Promise<Excursion[]> => {
    try {
      const payload = await getPayload({ config })
      
      const data = await payload.find({
        collection: 'excursions',
        limit: 100,
        depth: 1, // Populate mainImage (media) relation
        select: {
          title: true,
          slug: true,
          mainImage: true,
          price: true,
          duration: true,
          category: true,
          tourType: true,
          groupSize: true,
          languages: true,
          city: true,
          relatedDestination: true,
          updatedAt: true,
          createdAt: true,
        },
      })
      
      return data.docs as unknown as Excursion[]
    } catch (error) {
      console.error("Payload error in getAllExcursions:", error)
      return []
    }
  },
  ['excursions-all'],
  { tags: [CACHE_TAGS.excursions] }
)

export const getExcursionBySlug = cached(
  async (slug: string) => {
    try {
      const payload = await getPayload({ config })
      
      const data = await payload.find({
        collection: 'excursions',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
        depth: 2, // Keep depth 2 for detailed excursions query
      })
      
      return data.docs[0] || null
    } catch (error) {
      console.error("Payload error in getExcursionBySlug:", error)
      return null
    }
  },
  ['excursion-by-slug'],
  { tags: [CACHE_TAGS.excursions] }
)

export const getExcursionsByCity = cached(
  async (cityId: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'excursions',
        where: {
          city: {
            contains: cityId,
          },
        },
        limit: 100,
        depth: 2,
      })

      return data.docs as unknown as Excursion[]
    } catch (error) {
      console.error('Payload error in getExcursionsByCity:', error)
      return []
    }
  },
  ['excursions-by-city'],
  { tags: [CACHE_TAGS.excursions] }
)
