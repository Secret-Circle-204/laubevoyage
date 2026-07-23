import React from 'react'
import { HomePageLoader } from '@/application/pages/home/page-loader'
import { HomePage } from '@/components/features/home/HomePage'

export default async function Page() {
  const homeData = await HomePageLoader.load({ locale: 'en', currency: 'EGP' })

  return <HomePage data={homeData} />
}
