'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Badge, Rating, CurrencyDisplay, Button } from '@/components/ui'
import type { ExperienceCatalogDTO } from '@/application/experience/dto'

export function ExperiencesCatalogPage({ data }: { data: ExperienceCatalogDTO }) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>(data.filters.type || 'all')

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    if (type === 'all') {
      router.push('/experiences')
    } else {
      router.push(`/experiences?type=${type}`)
    }
  }

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3">
            Bespoke Portfolio
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Experiences Catalog
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base sm:text-lg">
            Discover luxury tour packages and private daily tours carefully crafted for luxury travelers.
          </p>
        </div>

        {/* Type Category Tabs Filter */}
        <div className="flex justify-center gap-3 mb-12">
          <Button
            variant={selectedType === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('all')}
          >
            All Experiences ({data.experiences.length})
          </Button>
          <Button
            variant={selectedType === 'package' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('package')}
          >
            Tour Packages
          </Button>
          <Button
            variant={selectedType === 'daily_tour' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('daily_tour')}
          >
            Private Daily Tours
          </Button>
        </div>

        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.experiences.map((item) => (
            <Link key={item.id} href={`/experiences/${item.slug}`} className="group">
              <Card variant="interactive" padding="none" className="flex flex-col h-full">
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
                    <span className="text-xs font-medium">📍 {item.location}</span>
                    <span className="text-xs font-medium">⏳ {item.durationDays} Days</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col justify-between flex-grow gap-4">
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
                    <CurrencyDisplay amountEGP={item.price.amountEGP} size="md" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
