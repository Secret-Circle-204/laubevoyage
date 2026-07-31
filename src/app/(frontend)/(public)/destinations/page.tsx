// src/app/(frontend)/(public)/destinations/page.tsx
import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DestinationsCatalogLoader } from '@/application/destination/loaders'
import { DestinationsCatalogPage } from '@/components/features/destination/DestinationsCatalogPage'



export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Destinations Directory | L'Aube Voyage",
    description: 'Explore countries and cities across Egypt and beyond.',
  }
}

export default async function Page() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const data = await DestinationsCatalogLoader.load({ locale, currency })
  return <DestinationsCatalogPage data={data} />
}
