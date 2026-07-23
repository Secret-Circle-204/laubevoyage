'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/providers/theme-provider'
import { CurrencyDisplay, Rating, EmptyState } from '@/components/ui'
import type { GlobalSearchPageDTO } from '@/application/search/dto'

export function GlobalSearchPage({ data }: { data: GlobalSearchPageDTO }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(data.query)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  return (
    <div className={`py-24 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.25em] font-medium text-[#00aeef] block mb-2">
            Global Search Engine
          </span>
          <h1 className={`text-4xl sm:text-5xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
            Search Results
          </h1>
          <div className="h-1 w-16 bg-[#f58220] mx-auto mt-3 mb-4" />
          <p className={`text-base sm:text-lg ${isDark ? 'text-[#a7aaac]' : 'text-[#666666]'}`}>
            Found {data.totalResults} results {data.query ? `for "${data.query}"` : 'across journeys, destinations, and guides.'}
          </p>

          {/* Interactive Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 flex gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search experiences, destinations, Nile cruises..."
              className={`w-full px-5 py-3.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00aeef] ${
                isDark
                  ? 'bg-[#1a1718] border-white/10 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              className="px-8 py-3.5 bg-[#f58220] hover:bg-[#2e3192] text-white font-semibold text-xs uppercase tracking-widest transition-all duration-300 rounded-xl shadow-lg shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results Grid or Empty State */}
        {data.items.length === 0 ? (
          <EmptyState
            title="No Results Found"
            description={`We couldn't find any experiences or destinations matching "${data.query || 'your search'}". Try searching for different keywords or explore our luxury destinations.`}
            icon="search"
            actionLabel="Browse All Experiences"
            actionHref="/experiences"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.items.map((item) => (
              <div
                key={item.id}
                className={`group flex flex-col ${
                  isDark ? 'bg-[#1a1718] border-[#a7aaac]/10' : 'bg-white border-[#231f20]/5 shadow-sm'
                } rounded-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
              >
                <div className="relative h-64 w-full overflow-hidden">
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

                  <div className="absolute top-6 left-6">
                    <span className="px-3 py-1 bg-[#231F20]/80 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider uppercase rounded-md border border-white/10">
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                </div>

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

                    <p
                      className={`text-sm mb-8 line-clamp-2 leading-relaxed ${
                        isDark ? 'text-[#a7aaac]' : 'text-[#666666]'
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  <Link href={item.url}>
                    <button
                      className={`w-full py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 border ${
                        isDark
                          ? 'border-[#00aeef]/50 text-[#00aeef] hover:bg-[#00aeef] hover:text-white'
                          : 'border-[#2e3192]/50 text-[#2e3192] hover:bg-[#2e3192] hover:text-white'
                      }`}
                    >
                      Explore Item →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
