'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/theme-provider'
import { CurrencyDisplay, EmptyState } from '@/components/ui'
import type { GlobalSearchPageDTO } from '@/application/search/dto'

export function GlobalSearchPage({ data }: { data: GlobalSearchPageDTO }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(data.query)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('q', searchTerm.trim())
    if (data.activeCategory) params.set('category', data.activeCategory)
    if (data.facets.minPrice) params.set('minPrice', String(data.facets.minPrice))
    if (data.facets.maxPrice) params.set('maxPrice', String(data.facets.maxPrice))
    const qStr = params.toString()
    router.push(qStr ? `/search?${qStr}` : '/search')
  }

  const handleCategorySelect = (category?: string) => {
    const params = new URLSearchParams()
    if (data.query) params.set('q', data.query)
    if (category && category !== 'all') params.set('category', category)
    if (data.facets.minPrice) params.set('minPrice', String(data.facets.minPrice))
    if (data.facets.maxPrice) params.set('maxPrice', String(data.facets.maxPrice))
    const qStr = params.toString()
    router.push(qStr ? `/search?${qStr}` : '/search')
  }

  const buildPaginationUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (data.query) params.set('q', data.query)
    if (data.activeCategory) params.set('category', data.activeCategory)
    if (data.facets.minPrice) params.set('minPrice', String(data.facets.minPrice))
    if (data.facets.maxPrice) params.set('maxPrice', String(data.facets.maxPrice))
    if (targetPage > 1) params.set('page', String(targetPage))
    const qStr = params.toString()
    return qStr ? `/search?${qStr}` : '/search'
  }

  const activeCategory = data.activeCategory || 'all'

  return (
    <div className={`py-24 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-medium text-[#00aeef] block mb-2">
            {data.labels.badge}
          </span>
          <h1 className={`text-4xl sm:text-5xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            {data.labels.title}
          </h1>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3 mb-4" />
          <p className={`text-base sm:text-lg ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
            {data.query
              ? data.labels.resultsForQuery.replace('{query}', data.query).replace('{count}', String(data.totalResults))
              : data.labels.resultsAll.replace('{count}', String(data.totalResults))}
          </p>

          {/* Interactive Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 flex gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={data.labels.placeholder}
              className={`w-full px-5 py-3.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00aeef] ${
                isDark
                  ? 'bg-[#1a1718] border-white/10 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              className="px-8 py-3.5 bg-[#f58220] hover:bg-[#2e3192] text-white font-semibold text-xs uppercase tracking-widest transition-all duration-300 rounded-xl shadow-lg shrink-0 cursor-pointer"
            >
              {data.labels.searchButton}
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#f58220] text-white shadow-md'
                  : isDark
                  ? 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {data.labels.filterAll}
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect('package')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                activeCategory === 'package'
                  ? 'bg-[#f58220] text-white shadow-md'
                  : isDark
                  ? 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {data.labels.filterPackages}
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect('daily_tour')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                activeCategory === 'daily_tour'
                  ? 'bg-[#f58220] text-white shadow-md'
                  : isDark
                  ? 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {data.labels.filterDailyTours}
            </button>
          </div>
        </div>

        {/* Results Grid or Empty State */}
        {data.items.length === 0 ? (
          <EmptyState
            title={data.labels.emptyTitle}
            description={data.labels.emptyDescription.replace('{query}', data.query || '')}
            icon="search"
            actionLabel={data.labels.emptyAction}
            actionHref="/experiences"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className={`group flex flex-col ${
                    isDark ? 'bg-[#1a1718] border-[#a7aaac]/10' : 'bg-white border-[#231f20]/5 shadow-sm'
                  } rounded-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
                >
                  <div className="relative h-64 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <Image
                      src={item.imageUrl || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${
                        isDark ? 'from-[#1a1718] via-transparent' : 'from-black/20 via-transparent'
                      } to-transparent opacity-60`}
                    />

                    {/* Type Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-[#231F20]/80 backdrop-blur-md text-white text-[10px] font-semibold tracking-wider uppercase rounded-md border border-white/10">
                        {item.experienceType === 'package' ? data.labels.filterPackages : (item.experienceType === 'daily_tour' ? data.labels.filterDailyTours : item.type.toUpperCase())}
                      </span>
                    </div>

                    {/* Price Tag with CurrencyDisplay */}
                    {item.price && (
                      <div className="absolute top-4 right-4">
                        <div className="px-3 py-1.5 bg-white/95 dark:bg-[#1a1718]/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20">
                          <span className="text-[#00aeef] font-bold tracking-tight text-xs">
                            <CurrencyDisplay price={item.price} size="sm" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col grow p-6 sm:p-8 justify-between">
                    <div>
                      <div className="mb-4">
                        <h3
                          className={`text-xl sm:text-2xl font-serif font-light mb-2 transition-colors duration-300 line-clamp-1 ${
                            isDark
                              ? 'text-white group-hover:text-[#f58220]'
                              : 'text-[#231f20] group-hover:text-[#2e3192]'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <div className="h-1 w-12 bg-[#f58220] transition-all duration-500 group-hover:w-24" />
                      </div>

                      <p
                        className={`text-sm mb-6 line-clamp-2 leading-relaxed ${
                          isDark ? 'text-[#a7aaac]' : 'text-[#666666]'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>

                    <Link href={item.url}>
                      <button
                        className={`w-full py-3.5 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 border rounded-lg cursor-pointer ${
                          isDark
                            ? 'border-[#00aeef]/50 text-[#00aeef] hover:bg-[#00aeef] hover:text-white'
                            : 'border-[#2e3192]/50 text-[#2e3192] hover:bg-[#2e3192] hover:text-white'
                        }`}
                      >
                        {data.labels.exploreItem}
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Server-Side Pagination Bar */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-12 mt-12 border-t border-slate-200 dark:border-white/10">
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-neutral-400">
                  {data.labels.showingCount
                    .replace('{page}', String(data.pagination.page))
                    .replace('{totalPages}', String(data.pagination.totalPages))
                    .replace('{total}', String(data.pagination.totalItems))}
                </span>

                <div className="flex items-center gap-3">
                  {data.pagination.page > 1 ? (
                    <Link
                      href={buildPaginationUrl(data.pagination.page - 1)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {data.labels.previousPage}
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-neutral-600 cursor-not-allowed">
                      {data.labels.previousPage}
                    </span>
                  )}

                  <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {data.pagination.page} / {data.pagination.totalPages}
                  </span>

                  {data.pagination.page < data.pagination.totalPages ? (
                    <Link
                      href={buildPaginationUrl(data.pagination.page + 1)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {data.labels.nextPage}
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-neutral-600 cursor-not-allowed">
                      {data.labels.nextPage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

