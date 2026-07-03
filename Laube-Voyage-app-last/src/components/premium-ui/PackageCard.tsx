'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { Package } from '@/payload-types'

interface PackageCardProps {
  pkg: Package
}

export function PackageCard({ pkg }: PackageCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const heroImage = typeof pkg.heroImage === 'object' ? pkg.heroImage : undefined
  const imageUrl =
    heroImage?.url ||
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'

  // Compute min price across dates with fallback
  const basePrice = pkg.adultPrice ?? pkg.price ?? 0
  const minPrice =
    pkg.dates && pkg.dates.length > 0
      ? Math.min(...pkg.dates.map((d) => d.adultPrice ?? basePrice).filter((p) => p > 0))
      : basePrice

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`group flex flex-col ${
        isDark ? 'bg-[#1a1718] border-[#A7AAAC]/10' : 'bg-white border-[#231F20]/5 shadow-sm'
      } rounded-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 active:shadow-2xl active:-translate-y-1`}
    >
      <div className="relative h-72 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={pkg.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-1000 group-hover:scale-110 group-active:scale-105"
        />
        {/* Subtle Overlay */}
        <div
          className={`absolute inset-0 bg-linear-to-t ${isDark ? 'from-[#1a1718] via-transparent' : 'from-black/20 via-transparent'} to-transparent opacity-60`}
        />

        {/* Price Tag */}
        <div className="absolute top-6 right-6">
          <div className="px-4 py-2 bg-white/95 backdrop-blur-md rounded-lg shadow-xl">
            <span className="text-secondary font-bold tracking-tight">
              From ${minPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col grow p-8">
        <div className="mb-4">
          <h3
            className={`text-2xl font-serif font-light mb-2 transition-colors duration-300 ${
              isDark
                ? 'text-white group-hover:text-[#F58220]'
                : 'text-[#231F20] group-hover:text-[#2E3192]'
            }`}
          >
            {pkg.title}
          </h3>
          <div className={`h-1 w-12 bg-[#F58220] transition-all duration-500 group-hover:w-24`} />
        </div>

        <p
          className={`text-sm mb-8 grow line-clamp-2 leading-relaxed ${
            isDark ? 'text-[#A7AAAC]' : 'text-[#666666]'
          }`}
        >
          Embark on a curated journey through {pkg.title}, where tradition meets modern
          sophistication in every detail.
        </p>

        <Link href={`/packages/${pkg.slug}`}>
          <button
            className={`w-full py-4 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 border ${
              isDark
                ? 'border-[#00AEEF]/50 text-[#00AEEF] hover:bg-[#00AEEF] hover:text-white'
                : 'border-[#2E3192]/50 text-[#2E3192] hover:bg-[#2E3192] hover:text-white'
            }`}
          >
            View Itinerary
          </button>
        </Link>
      </div>
    </motion.div>
  )
}
