'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Badge, Input, Button, CurrencyDisplay, Rating } from '@/components/ui'
import type { GlobalSearchPageDTO } from '@/application/search/dto'

export function GlobalSearchPage({ data }: { data: GlobalSearchPageDTO }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(data.query)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3">
            Global Search Engine
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Search Results
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
            Found {data.totalResults} results {data.query ? `for "${data.query}"` : 'across journeys, destinations, and guides.'}
          </p>

          {/* Interactive Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 flex gap-3 max-w-2xl mx-auto">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search experiences, destinations, Nile cruises..."
              className="bg-white dark:bg-slate-900 shadow-sm"
            />
            <Button variant="primary" type="submit">
              Search
            </Button>
          </form>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.items.map((item) => (
            <Link key={item.id} href={item.url} className="group">
              <Card variant="interactive" padding="none" className="flex flex-col h-full">
                <div className="relative h-56 w-full bg-slate-200 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  <div className="absolute top-4 left-4">
                    <Badge
                      variant={
                        item.type === 'experience'
                          ? 'primary'
                          : item.type === 'destination'
                          ? 'secondary'
                          : 'accent'
                      }
                      size="sm"
                    >
                      {item.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 flex flex-col justify-between flex-grow gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#00aeef] transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-3">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {item.rating ? (
                      <Rating value={item.rating} size="sm" />
                    ) : (
                      <span className="text-xs text-slate-400">View Details</span>
                    )}

                    {item.priceEGP && <CurrencyDisplay amountEGP={item.priceEGP} size="sm" />}
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
