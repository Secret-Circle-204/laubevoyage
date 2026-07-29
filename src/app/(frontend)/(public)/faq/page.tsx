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

import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const data = await FaqLoader.load({ locale })
  return <FaqAccordionPage data={data} />
}
