'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge, Rating, CurrencyDisplay, Button } from '@/components/ui'
import type { HomeFeaturedExperienceDTO } from '@/application/pages/home/dto'

export function FeaturedExperiencesWidget({ experiences }: { experiences: HomeFeaturedExperienceDTO[] }) {
  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Badge variant="secondary" className="mb-3">
              Curated Selection
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Featured Luxury Experiences
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-base max-w-xl">
              Explore handpicked tour packages and private daily tours designed for extraordinary memories.
            </p>
          </div>

          <Link href="/experiences">
            <Button variant="outline" size="md">
              View All Experiences →
            </Button>
          </Link>
        </div>

        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {experiences.map((item) => (
            <Card key={item.id} variant="interactive" padding="none" className="group flex flex-col h-full">
              {/* Image Container */}
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

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-xs font-medium flex items-center gap-1">
                    📍 {item.location}
                  </span>
                  <span className="text-xs font-medium">
                    ⏳ {item.durationDays} Days
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#00aeef] transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Rating value={item.rating} reviewsCount={item.reviewsCount} size="sm" />

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block -mb-1">From</span>
                    <CurrencyDisplay
                      amountEGP={item.price.amountEGP}
                      displayAmount={item.price.displayAmount}
                      displayCurrency={item.price.displayCurrency}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
