'use client'

import React from 'react'
import type { HomeDTO } from '@/application/pages/home/dto'
import { HeroWidget } from '@/components/widgets/home/HeroWidget'
import { FeaturedExperiencesWidget } from '@/components/widgets/home/FeaturedExperiencesWidget'
import { DestinationsWidget } from '@/components/widgets/home/DestinationsWidget'

export function HomePage({ data }: { data: HomeDTO }) {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <HeroWidget data={data.hero} />
      <FeaturedExperiencesWidget experiences={data.featuredExperiences} />
      <DestinationsWidget destinations={data.topDestinations} />
    </div>
  )
}
