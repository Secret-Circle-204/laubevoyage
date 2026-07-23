import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExperienceDetailsLoader } from '@/application/experience/loaders-details'
import { ExperienceDetailsPage } from '@/components/features/experience/ExperienceDetailsPage'

export const revalidate = 1800

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const data = await ExperienceDetailsLoader.loadBySlug(params.slug)

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
}) {
  const params = await props.params
  const data = await ExperienceDetailsLoader.loadBySlug(params.slug)

  if (!data) {
    notFound()
  }

  return <ExperienceDetailsPage data={data} />
}
