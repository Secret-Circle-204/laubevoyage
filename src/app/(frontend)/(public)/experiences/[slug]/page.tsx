import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ExperienceDetailsLoader } from '@/application/experience/loaders-details'
import { ExperienceDetailsPage } from '@/components/features/experience/ExperienceDetailsPage'

export const revalidate = 1800

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ adults?: string; [key: string]: any }>
}): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value
  const adults = Number(searchParams.adults) || 2

  const data = await ExperienceDetailsLoader.loadBySlug(params.slug, { locale, currency, adults })

  if (!data) {
    return { title: "Experience Not Found | L'Aube Voyage" }
  }

  return {
    title: `${data.title} | L'Aube Voyage`,
    description: data.subtitle,
  }
}

export default async function Page(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ adults?: string; [key: string]: any }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value
  const adults = Number(searchParams.adults) || 2

  const data = await ExperienceDetailsLoader.loadBySlug(params.slug, { locale, currency, adults })

  if (!data) {
    notFound()
  }

  return <ExperienceDetailsPage data={data} />
}

