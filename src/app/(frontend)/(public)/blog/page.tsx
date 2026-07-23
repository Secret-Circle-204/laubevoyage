import React from 'react'
import type { Metadata } from 'next'
import { BlogCatalogLoader } from '@/application/blog/loaders'
import { BlogCatalogPage } from '@/components/features/blog/BlogCatalogPage'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Travel Journal & Luxury Guides | L'Aube Voyage",
    description: 'Expert insights, Egyptologist perspectives, and luxury journey stories across Egypt.',
  }
}

export default async function Page() {
  const data = await BlogCatalogLoader.load()
  return <BlogCatalogPage data={data} />
}
