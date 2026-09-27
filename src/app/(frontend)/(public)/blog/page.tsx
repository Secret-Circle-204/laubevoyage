import React from 'react'
import type { Metadata } from 'next'
import { BlogCatalogLoader } from '@/application/blog/loaders'
import { BlogCatalogPage } from '@/components/features/blog/BlogCatalogPage'



export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Travel Journal & Luxury Guides | L'Aube Voyage",
    description: 'Expert insights, cultural perspectives, and luxury journey stories tailored for discerning travelers.',
  }
}

import { cookies } from 'next/headers'

export default async function Page(props: {
  searchParams?: Promise<{ page?: string; category?: string }>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const page = Math.max(1, Number(searchParams.page) || 1)
  const category = searchParams.category

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const data = await BlogCatalogLoader.load({ locale, page, limit: 9, category })
  return <BlogCatalogPage data={data} />
}
