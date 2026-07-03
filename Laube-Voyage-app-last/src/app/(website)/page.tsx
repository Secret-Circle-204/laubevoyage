import 'server-only'
import { getAllDestinations } from '@/services/destinations'
import { getAllBlogPosts } from '@/services/blog'
import { getLatestPackages } from '@/services/packages'
import { getHomePageConfig } from '@/services/globals'
import HomeClient from './HomeClient'
import type { Destination, BlogPost } from '@/payload-types'

export default async function Home() {
  // Fetch data for sections using cached wrappers concurrently
  const [destinations, blogPosts, homeConfig, featuredPackages] = await Promise.all([
    getAllDestinations(),
    getAllBlogPosts(),
    getHomePageConfig(),
    getLatestPackages(),
  ])

  return (
    <HomeClient
      destinations={destinations as Destination[]}
      blogPosts={blogPosts as BlogPost[]}
      videoGallery={homeConfig?.videoGallery || []}
      featuredPackages={featuredPackages}
    />
  )
}
