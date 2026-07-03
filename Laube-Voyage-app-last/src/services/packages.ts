import 'server-only'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { Package } from '../payload-types'

export const getAllPackages = cached(
  async (): Promise<Package[]> => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'packages',
        limit: 100,
        depth: 1, // Optimized depth for listing
        select: {
          title: true,
          slug: true,
          heroImage: true,
          adultPrice: true,
          price: true,
          dates: true,
          duration: true,
          tourType: true,
          relatedDestination: true,
          city: true,
          updatedAt: true,
          createdAt: true,
        },
      })

      return data.docs as unknown as Package[]
    } catch (error) {
      console.error('Payload error in getAllPackages:', error)
      return []
    }
  },
  ['packages-all'],
  { tags: [CACHE_TAGS.packages] }
)

export const getPackageBySlug = cached(
  async (slug: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'packages',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
        depth: 2, // Retain depth 2 for detail page relations (hotels, etc.)
      })

      return data.docs[0] || null
    } catch (error) {
      console.error('Payload error in getPackageBySlug:', error)
      return null
    }
  },
  ['package-by-slug'],
  { tags: [CACHE_TAGS.packages] }
)

export const getLatestPackages = cached(
  async (): Promise<Package[]> => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'packages',
        limit: 10,
        depth: 1, // list query optimized to depth: 1
        sort: '-createdAt',
        select: {
          title: true,
          slug: true,
          heroImage: true,
          adultPrice: true,
          price: true,
          dates: true,
          duration: true,
          tourType: true,
          relatedDestination: true,
          city: true,
          updatedAt: true,
          createdAt: true,
        }
      })

      return data.docs as unknown as Package[]
    } catch (error) {
      console.error('Payload error in getLatestPackages:', error)
      return []
    }
  },
  ['packages-latest'],
  { tags: [CACHE_TAGS.packages] }
)
