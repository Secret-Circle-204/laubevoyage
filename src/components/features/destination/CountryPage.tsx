'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import type { CountryDetailsDTO } from '@/application/destination/dto'

export function CountryPage({ data }: { data: CountryDetailsDTO }) {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/destinations">
          <Button variant="ghost" size="sm" className="mb-8">
            ← Back to All Destinations
          </Button>
        </Link>

        {/* Country Hero Header */}
        <div className="relative h-80 w-full rounded-3xl overflow-hidden mb-12 shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${data.country.bannerUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          <div className="absolute bottom-8 left-8 right-8 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col gap-2 max-w-2xl">
              <Badge variant="accent" className="w-fit">
                Country Directory
              </Badge>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">{data.country.name}</h1>
              <p className="text-base sm:text-lg text-slate-300 line-clamp-2">{data.country.description}</p>
            </div>

            <Link href={`/experiences?countryId=${data.country.id}`} className="shrink-0">
              <button className="px-6 py-2.5 bg-[#f58220] hover:bg-[#2e3192] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-lg">
                Filter {data.country.name} Experiences →
              </button>
            </Link>
          </div>
        </div>

        {/* Cities Section */}
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
          Cities in {data.country.name}
        </h2>

        {data.cities.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-12">
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-2xl font-serif font-light mb-2 text-slate-900 dark:text-white">
              No Cities Listed for {data.country.name}
            </h3>
            <p className="text-sm max-w-md mx-auto mb-6 text-slate-500 dark:text-slate-400">
              Explore our other destinations or view all available experiences.
            </p>
            <Link href="/destinations">
              <Button variant="primary" size="sm">
                View All Destinations
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.cities.map((city) => (
              <Link key={city.id} href={`/destinations/${data.country.slug}/${city.slug}`} className="group">
                <Card variant="interactive" padding="none" className="flex flex-col h-full">
                  <div className="relative h-56 w-full bg-slate-200 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url(${city.bannerUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  </div>

                  <div className="p-6 flex flex-col justify-between flex-grow gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-[#00aeef] transition-colors">
                        {city.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {city.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        {city.experiencesCount > 0 ? `${city.experiencesCount} Experiences` : 'Explore City'}
                      </span>
                      <span className="text-xs font-bold text-[#00aeef] group-hover:translate-x-1 transition-transform">
                        View Experiences →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-12 mt-12 border-t border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalDocs} total cities)
            </span>

            <div className="flex items-center gap-3">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={`/destinations/${data.country.slug}?page=${data.pagination.page - 1}`}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  ← Previous
                </span>
              )}

              {data.pagination.hasNextPage ? (
                <Link
                  href={`/destinations/${data.country.slug}?page=${data.pagination.page + 1}`}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

