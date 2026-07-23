import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityLoader } from '@/application/destination/loaders'
import { CityExperiencesPage } from '@/components/features/destination/CityExperiencesPage'

export const revalidate = 3600

export async function generateMetadata(props: {
  params: Promise<{ countrySlug: string; citySlug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const data = await CityLoader.loadBySlugs(params.countrySlug, params.citySlug)

  if (!data) {
    return { title: "City Not Found | L'Aube Voyage" }
  }

  return {
    title: `${data.city.name}, ${data.country.name} Experiences | L'Aube Voyage`,
    description: data.city.description,
  }
}

export default async function Page(props: {
  params: Promise<{ countrySlug: string; citySlug: string }>
}) {
  const params = await props.params
  const data = await CityLoader.loadBySlugs(params.countrySlug, params.citySlug)

  if (!data) {
    notFound()
  }

  return <CityExperiencesPage data={data} />
}
