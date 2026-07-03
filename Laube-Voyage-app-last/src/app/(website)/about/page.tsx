import React from 'react'
import { getAboutPageConfig } from '@/services/globals'
import AboutClient from './AboutClient'

export default async function AboutPage() {
  const data = await getAboutPageConfig()

  if (!data) {
    return <AboutClient data={{}} />
  }

  return <AboutClient data={data} />
}
