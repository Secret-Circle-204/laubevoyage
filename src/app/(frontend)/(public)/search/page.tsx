import React from 'react'
import type { Metadata } from 'next'
import { GlobalSearchLoader } from '@/application/search/loaders'
import { GlobalSearchPage } from '@/components/features/search/GlobalSearchPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const searchParams = await props.searchParams
  const q = searchParams.q || ''

  return {
    title: q ? `Search Results for "${q}" | L'Aube Voyage` : "Search Experiences & Journeys | L'Aube Voyage",
    description: 'Find luxury journeys, daily tours, Nile cruises, and destinations across Egypt.',
  }
}

export default async function Page(props: {
  searchParams: Promise<{ q?: string; category?: string; minPrice?: string; maxPrice?: string }>
}) {
  const searchParams = await props.searchParams

  const data = await GlobalSearchLoader.load({
    query: searchParams.q,
    category: searchParams.category,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
  })

  return <GlobalSearchPage data={data} />
}
