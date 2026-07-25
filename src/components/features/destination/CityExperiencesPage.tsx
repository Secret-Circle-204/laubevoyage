'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge, Rating, CurrencyDisplay, Button } from '@/components/ui'
import type { CityExperiencesDTO } from '@/application/destination/dto'

export function CityExperiencesPage({ data }: { data: CityExperiencesDTO }) {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={`/destinations/${data.country.slug}`}>
          <Button variant="ghost" size="sm" className="mb-8">
            ← Back to {data.country.name} Cities
          </Button>
        </Link>

        {/* City Header */}
        <div className="relative h-80 w-full rounded-3xl overflow-hidden mb-12 shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${data.city.bannerUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          <div className="absolute bottom-8 left-8 right-8 text-white flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#00aeef]">
              {data.country.name} ➔ {data.city.name}
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              Experiences in {data.city.name}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl">{data.city.description}</p>
          </div>
        </div>

        {/* Experiences Grid */}
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
          Available Journeys & Daily Tours
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.experiences.map((item) => (
            <Card key={item.id} variant="interactive" padding="none" className="group flex flex-col h-full">
              <div className="relative h-64 w-full bg-slate-200 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant={item.type === 'package' ? 'primary' : 'accent'} size="sm">
                    {item.type === 'package' ? 'Tour Package' : 'Daily Tour'}
                  </Badge>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#00aeef] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Rating value={item.rating} reviewsCount={item.reviewsCount} size="sm" />
                  <CurrencyDisplay price={item.price} size="md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
