import 'server-only'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

export const getAllDestinations = cached(
  async () => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'destinations',
        limit: 100,
        depth: 1, // Populate image (media) relation
        select: {
          name: true,
          slug: true,
          image: true,
          region: true,
          country: true,
          updatedAt: true,
          createdAt: true,
        },
      })

      return data.docs
    } catch (error) {
      console.error('Payload error in getAllDestinations:', error)
      return []
    }
  },
  ['destinations-all'],
  { tags: [CACHE_TAGS.destinations] }
)

export const getDestinationBySlug = cached(
  async (slug: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'destinations',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
        depth: 1,
      })

      return data.docs[0] || null
    } catch (error) {
      console.error('Payload error in getDestinationBySlug:', error)
      return null
    }
  },
  ['destination-by-slug'],
  { tags: [CACHE_TAGS.destinations] }
)

export const getExcursionsByDestination = cached(
  async (destinationId: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'excursions',
        where: {
          relatedDestination: {
            equals: destinationId,
          },
        },
        limit: 100,
        depth: 2,
      })

      return data.docs
    } catch (error) {
      console.error('Payload error in getExcursionsByDestination:', error)
      return []
    }
  },
  ['excursions-by-destination'],
  { tags: [CACHE_TAGS.destinations, CACHE_TAGS.excursions] }
)

export const getPackagesByDestination = cached(
  async (destinationId: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'packages',
        where: {
          relatedDestination: {
            equals: destinationId,
          },
        },
        limit: 100,
        depth: 2,
      })

      return data.docs
    } catch (error) {
      console.error('Payload error in getPackagesByDestination:', error)
      return []
    }
  },
  ['packages-by-destination'],
  { tags: [CACHE_TAGS.destinations, CACHE_TAGS.packages] }
)

export const getAllCities = cached(
  async () => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'cities',
        limit: 100,
        depth: 0,
      })

      return data.docs
    } catch (error) {
      console.error('Payload error in getAllCities:', error)
      return []
    }
  },
  ['cities-all'],
  { tags: [CACHE_TAGS.destinations] }
)
