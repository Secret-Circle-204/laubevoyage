import React from 'react'
import { cookies } from 'next/headers'
import { HomePageLoader } from '@/application/pages/home/page-loader'
import { HomePage } from '@/components/features/home/HomePage'

export default async function Page() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value || 'en'
  const currency = cookieStore.get('laube-currency')?.value || 'EGP'

  const homeData = await HomePageLoader.load({ locale, currency })

  return <HomePage data={homeData} />
}

