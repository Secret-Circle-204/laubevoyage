import React from 'react'
import { HomePageLoader } from '@/application/pages/home/page-loader'
import { HomePage as HomePageComponent } from '@/components/features/home/HomePage'

export default async function HomePage() {
  const homeData = await HomePageLoader.load()

  return <HomePageComponent data={homeData} />
}
