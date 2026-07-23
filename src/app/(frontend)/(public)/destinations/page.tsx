import React from 'react'
import type { Metadata } from 'next'
import { DestinationsCatalogLoader } from '@/application/destination/loaders'
import { DestinationsCatalogPage } from '@/components/features/destination/DestinationsCatalogPage'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Destinations Directory | L'Aube Voyage",
    description: 'Explore countries and cities across Egypt and beyond.',
  }
}

export default async function Page() {
  const data = await DestinationsCatalogLoader.load()
  return <DestinationsCatalogPage data={data} />
}
