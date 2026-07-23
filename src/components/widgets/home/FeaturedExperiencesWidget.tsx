'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/providers/theme-provider'
import { CurrencyDisplay } from '@/components/ui'
import type { HomeFeaturedExperienceDTO } from '@/application/pages/home/dto'

export function FeaturedExperiencesWidget({ experiences }: { experiences: HomeFeaturedExperienceDTO[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className={`py-20 ${isDark ? 'bg-[#231F20]' : 'bg-slate-50'} transition-colors duration-500 border-b border-white/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] font-medium text-[#00aeef] block mb-2">
              Curated Selection
            </span>
            <h2 className={`text-3xl sm:text-4xl font-serif font-light tracking-tight ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
              Featured Luxury Experiences
            </h2>
            <div className="h-1 w-16 bg-[#f58220] mt-3" />
          </div>

          <Link href="/experiences">
            <button
              className={`px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all duration-500 ${
                isDark
                  ? 'border-[#00aeef]/50 text-[#00aeef] hover:bg-[#00aeef] hover:text-white'
                  : 'border-[#2e3192]/50 text-[#2e3192] hover:bg-[#2e3192] hover:text-white'
              }`}
            >
              View All Experiences →
            </button>
          </Link>
        </div>

        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {experiences.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col ${
                isDark ? 'bg-[#1a1718] border-[#a7aaac]/10' : 'bg-white border-[#231f20]/5 shadow-sm'
              } rounded-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
            >
              {/* Image Container */}
              <div className="relative h-72 w-full overflow-hidden">
                <Image
                  src={item.imageUrl || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />

                {/* Subtle Gradient Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    isDark ? 'from-[#1a1718] via-transparent' : 'from-black/20 via-transparent'
                  } to-transparent opacity-60`}
                />

                {/* Type Badge */}
                <div className="absolute top-6 left-6">
                  <span className="px-3 py-1 bg-[#231F20]/80 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider uppercase rounded-md border border-white/10">
                    {item.type === 'package' ? 'Tour Package' : 'Daily Tour'}
                  </span>
                </div>

                {/* Price Tag */}
                <div className="absolute top-6 right-6">
                  <div className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-xl">
                    <span className="text-[#00aeef] font-bold tracking-tight text-sm">
                      <CurrencyDisplay
                        amountEGP={item.price.amountEGP}
                        displayAmount={item.price.displayAmount}
                        displayCurrency={item.price.displayCurrency}
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

                  <p
                    className={`text-sm mb-8 line-clamp-2 leading-relaxed ${
                      isDark ? 'text-[#a7aaac]' : 'text-[#666666]'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>

                <Link href={`/experiences/${item.id}`}>
                  <button
                    className={`w-full py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 border ${
                      isDark
                        ? 'border-[#00aeef]/50 text-[#00aeef] hover:bg-[#00aeef] hover:text-white'
                        : 'border-[#2e3192]/50 text-[#2e3192] hover:bg-[#2e3192] hover:text-white'
                    }`}
                  >
                    View Itinerary
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
