'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import type { HomeDestinationCardDTO } from '@/application/pages/home/dto'

export function DestinationsWidget({ destinations }: { destinations: HomeDestinationCardDTO[] }) {
  return (
    <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="primary" className="mb-3">
            Geographical Exploration
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Top Travel Destinations
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
            Structured Country ➔ City journey exploration across Egypt&apos;s ancient wonders and coastal paradises.
          </p>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.countrySlug}/${dest.citySlug}`}
              className="group"
            >
              <Card variant="interactive" padding="none" className="relative h-80 w-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                  style={{ backgroundImage: `url(${dest.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1 text-white">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#00aeef]">
                    {dest.countryName}
                  </span>
                  <h3 className="text-2xl font-bold text-white group-hover:text-[#00aeef] transition-colors">
                    {dest.cityName}
                  </h3>
                  <span className="text-xs text-slate-300 font-medium mt-1">
                    {dest.experiencesCount} Experiences Available →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
