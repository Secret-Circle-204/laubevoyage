'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { Excursion } from '@/payload-types'

interface ExcursionCardProps {
  excursion: Excursion
}

const categoryColors: Record<string, string> = {
  'sea-trips': 'bg-cyan-500/90',
  'safari-adventure': 'bg-emerald-500/90',
  'cultural-history': 'bg-amber-600/90',
  'family-kids': 'bg-pink-500/90',
}

const categoryLabels: Record<string, string> = {
  'sea-trips': 'Sea Trips',
  'safari-adventure': 'Safari & Adventure',
  'cultural-history': 'Cultural & History',
  'family-kids': 'Family & Kids',
}

export function ExcursionCard({ excursion }: ExcursionCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const mainImage = typeof excursion.mainImage === 'object' ? excursion.mainImage : undefined
  const imageUrl =
    mainImage?.url ||
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'

  const destination =
    excursion.relatedDestination && typeof excursion.relatedDestination === 'object'
      ? excursion.relatedDestination?.name
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`group flex flex-col ${
        isDark ? 'bg-[#1a1718] border-gray/10' : 'bg-white border-dark/5 shadow-sm'
      } rounded-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={excursion.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-linear-to-t ${isDark ? 'from-[#1a1718] via-transparent' : 'from-black/30 via-transparent'} to-transparent opacity-60`}
        />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span
            className={`px-3 py-1 text-xs uppercase tracking-widest text-white font-medium rounded-full ${categoryColors[excursion.category] || 'bg-gray-500/90'}`}
          >
            {categoryLabels[excursion.category] || excursion.category}
          </span>
        </div>

        {/* Price Tag */}
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-lg shadow-lg">
            <span className="text-secondary font-bold text-sm">
              ${excursion.price?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full">
            <svg
              className="w-4 h-4 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-white/90 text-xs font-medium">{excursion.duration}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col grow p-6">
        {destination && (
          <span
            className={`text-xs tracking-widest uppercase mb-2 ${isDark ? 'text-secondary' : 'text-accent'}`}
          >
            {destination}
          </span>
        )}

        <h3
          className={`text-xl font-serif font-light mb-3 transition-colors duration-300 ${
            isDark ? 'text-white group-hover:text-accent' : 'text-dark group-hover:text-primary'
          }`}
        >
          {excursion.title}
        </h3>

        <div className={`h-0.5 w-10 bg-accent transition-all duration-500 group-hover:w-20 mb-4`} />

        <Link href={`/excursions/${excursion.slug}`} className="mt-auto">
          <button
            className={`w-full py-3 text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 border ${
              isDark
                ? 'border-secondary/50 text-secondary hover:bg-secondary hover:text-white'
                : 'border-primary/50 text-primary hover:bg-primary hover:text-white'
            }`}
          >
            Explore Experience
          </button>
        </Link>
      </div>
    </motion.div>
  )
}
