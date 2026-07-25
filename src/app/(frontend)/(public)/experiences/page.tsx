// src/app/(frontend)/(public)/experiences/page.tsx
import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ExperienceSearchParser } from '@/application/shared/parsers/experience-search-parser'
import { ExperiencesCatalogLoader } from '@/application/experience/loaders'
import { ExperiencesCatalogPage } from '@/components/features/experience/ExperiencesCatalogPage'

import { getDomainServices } from '@/domains/factory'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const { localization } = await getDomainServices()
  const ctx = localization.buildContext({ language: locale as any })

  const title = localization.translateUiKey('catalog.meta.title', ctx)
  const description = localization.translateUiKey('catalog.meta.description', ctx)

  return { title, description }
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const parsedFilters = ExperienceSearchParser.parse(searchParams)
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const currency = cookieStore.get('laube-currency')?.value || 'EGP'

  const data = await ExperiencesCatalogLoader.load(parsedFilters, { locale, currency })

  return <ExperiencesCatalogPage data={data} />
}
