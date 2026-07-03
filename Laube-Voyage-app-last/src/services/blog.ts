import 'server-only'
import config from '@/payload.config'
import { getPayload, type Where } from 'payload'
import { cached } from '@/lib/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { BlogPost } from '../payload-types'

/**
 * Get all published blog posts
 */
export const getAllBlogPosts = cached(
  async (category?: string) => {
    try {
      const payload = await getPayload({ config })

      const where: Where = {
        status: {
          equals: 'published',
        },
      }

      if (category) {
        where.categories = {
          contains: category,
        }
      }

      const data = await payload.find({
        collection: 'blog-posts',
        where,
        sort: '-publishedAt',
        depth: 1, // Populate author and featured image
        select: {
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          featuredImage: true,
          excerpt: true,
          categories: true,
          author: true,
          updatedAt: true,
          createdAt: true,
        },
      })

      return data.docs as unknown as BlogPost[]
    } catch (error) {
      console.error('Payload error in getAllBlogPosts:', error)
      return []
    }
  },
  ['blog-posts-all'],
  { tags: [CACHE_TAGS.blog] }
)

/**
 * Get a single blog post by slug
 */
export const getBlogPostBySlug = cached(
  async (slug: string) => {
    try {
      const payload = await getPayload({ config })

      const data = await payload.find({
        collection: 'blog-posts',
        where: {
          slug: {
            equals: slug,
          },
          status: {
            equals: 'published',
          },
        },
        depth: 1,
      })

      return (data.docs[0] as unknown as BlogPost) || null
    } catch (error) {
      console.error('Payload error in getBlogPostBySlug:', error)
      return null
    }
  },
  ['blog-post-by-slug'],
  { tags: [CACHE_TAGS.blog] }
)
