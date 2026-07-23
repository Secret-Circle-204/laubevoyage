import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { CountryLoader } from '@/application/destination/loaders'
import { CountryPage } from '@/components/features/destination/CountryPage'

export const revalidate = 3600

export async function generateMetadata(props: { params: Promise<{ countrySlug: string }> }): Promise<Metadata> {
  const params = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const currency = cookieStore.get('laube-currency')?.value || 'EGP'

  const data = await CountryLoader.loadBySlug(params.countrySlug, { locale, currency })

  if (!data) {
    return { title: "Country Not Found | L'Aube Voyage" }
  }

  return {
    title: `${data.country.name} Travel & Cities | L'Aube Voyage`,
    description: data.country.description,
  }
}

export default async function Page(props: { params: Promise<{ countrySlug: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const currency = cookieStore.get('laube-currency')?.value || 'EGP'

  const data = await CountryLoader.loadBySlug(params.countrySlug, { locale, currency })

  if (!data) {
    notFound()
  }

  return <CountryPage data={data} />
}

