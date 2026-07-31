import React from 'react'
import type { Metadata } from 'next'
import { BlogCatalogLoader } from '@/application/blog/loaders'
import { BlogCatalogPage } from '@/components/features/blog/BlogCatalogPage'



export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Travel Journal & Luxury Guides | L'Aube Voyage",
    description: 'Expert insights, Egyptologist perspectives, and luxury journey stories across Egypt.',
  }
}

import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const data = await BlogCatalogLoader.load({ locale })
  return <BlogCatalogPage data={data} />
}
