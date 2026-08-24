'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge, Button, CurrencyDisplay, Rating } from '@/components/ui'
import type { ExperienceCatalogDTO } from '@/application/experience/dto'

export function ExperiencesCatalogPage({ data }: { data: ExperienceCatalogDTO }) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>(data.filters.type || 'all')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    if (type === 'all') {
      router.push('/experiences')
    } else {
      router.push(`/experiences?type=${type}`)
    }
  }

  return (
    <div className={`py-24 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-3">
            {data.labels.badge}
          </Badge>
          <h1 className={`text-4xl sm:text-5xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            {data.labels.title}
          </h1>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3 mb-4" />
          <p className={`text-base sm:text-lg ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
            {data.labels.description}
          </p>
        </div>
 
        {/* Type Category Tabs Filter */}
        <div className="flex justify-center gap-3 mb-16">
          <Button
            variant={selectedType === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('all')}
          >
            {data.labels.filterAll}
          </Button>
          <Button
            variant={selectedType === 'package' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('package')}
          >
            {data.labels.filterPackages}
          </Button>
          <Button
            variant={selectedType === 'daily_tour' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('daily_tour')}
          >
            {data.labels.filterDailyTours}
          </Button>
        </div>
 
        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.experiences.map((item) => (
            <Card key={item.id} variant="interactive" padding="none" className="group flex flex-col h-full">
              {/* Image Container */}
              <div className="relative h-72 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white/40">
                    <span className="text-4xl">✈️</span>
                  </div>
                )}

 
                {/* Subtle Gradient Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    isDark ? 'from-[#1a1718] via-transparent' : 'from-black/20 via-transparent'
                  } to-transparent opacity-60`}
                />
 
                {/* Type Badge */}
                <div className="absolute top-6 left-6">
                  <Badge variant={item.type === 'package' ? 'primary' : 'accent'} size="sm">
                    {item.type === 'package' ? data.labels.packageLabel : data.labels.dailyTourLabel}
                  </Badge>
                </div>
 
                {/* Price Tag */}
                <div className="absolute top-6 right-6">
                  <div className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-xl">
                    <span className="text-[#00aeef] font-bold tracking-tight text-sm">
                      <CurrencyDisplay
                        price={item.price}
                        size="sm"
                      />
                    </span>
                  </div>
                </div>
              </div>
 
              {/* Card Details */}
              <div className="flex flex-col grow p-8 justify-between">
                <div>
                  <div className="mb-4">
                    <h3
                      className={`text-2xl font-serif font-light mb-2 transition-colors duration-300 line-clamp-1 ${
                        isDark
                          ? 'text-white group-hover:text-[#f58220]'
                          : 'text-[#231f20] group-hover:text-[#2e3192]'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <div className="h-1 w-12 bg-[#f58220] transition-all duration-500 group-hover:w-24" />
                  </div>
 
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    📍 {item.location}
                  </span>
 
                  <p
                    className={`text-sm mb-8 line-clamp-2 leading-relaxed ${
                      isDark ? 'text-[#a7aaac]' : 'text-[#666666]'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
 
                <Link href={`/experiences/${item.slug}`}>
                  <Button variant="outline" size="md" className="w-full">
                    {data.labels.viewItinerary}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
