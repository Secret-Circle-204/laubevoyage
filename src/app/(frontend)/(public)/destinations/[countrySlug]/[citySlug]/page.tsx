import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { CityLoader } from '@/application/destination/loaders'
import { CityExperiencesPage } from '@/components/features/destination/CityExperiencesPage'

export const revalidate = 3600

export async function generateMetadata(props: {
  params: Promise<{ countrySlug: string; citySlug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const data = await CityLoader.loadBySlugs(params.countrySlug, params.citySlug, { locale, currency })

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
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const data = await CityLoader.loadBySlugs(params.countrySlug, params.citySlug, { locale, currency })

  if (!data) {
    notFound()
  }

  return <CityExperiencesPage data={data} />
}

