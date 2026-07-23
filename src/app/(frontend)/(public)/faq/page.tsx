import React from 'react'
import type { Metadata } from 'next'
import { FaqLoader } from '@/application/blog/loaders'
import { FaqAccordionPage } from '@/components/features/faq/FaqAccordionPage'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frequently Asked Questions | L'Aube Voyage",
    description: 'Find answers about bookings, luxury transfers, customized itineraries, and policies.',
  }
}

export default async function Page() {
  const data = await FaqLoader.load()
  return <FaqAccordionPage data={data} />
}
