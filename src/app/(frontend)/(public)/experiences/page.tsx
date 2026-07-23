import React from 'react'
import type { Metadata } from 'next'
import { ExperienceSearchParser } from '@/application/shared/parsers/experience-search-parser'
import { ExperiencesCatalogLoader } from '@/application/experience/loaders'
import { ExperiencesCatalogPage } from '@/components/features/experience/ExperiencesCatalogPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Luxury Experiences & Tour Packages Catalog | L'Aube Voyage",
    description: 'Browse luxury tour packages, Nile cruises, and private daily tours across Egypt.',
  }
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const parsedFilters = ExperienceSearchParser.parse(searchParams)
  const data = await ExperiencesCatalogLoader.load(parsedFilters)

  return <ExperiencesCatalogPage data={data} />
}
