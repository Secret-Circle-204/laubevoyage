'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ExcursionCard } from './ExcursionCard'
import type { Excursion } from '@/payload-types'

// ─── Category config ────────────────────────────────────────
const categories = [
  {
    value: 'all',
    label: 'All Experiences',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    gradient: 'from-primary to-secondary',
    bgLight: 'bg-primary/5',
    bgDark: 'bg-primary/10',
    borderActive: 'border-primary',
  },
  {
    value: 'sea-trips',
    label: 'Sea Trips',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 17h1l1-2 1 2 1-2 1 2 1-2 1 2 1-2 1 2 1-2 1 2 1-2 1 2h1M5 21h14M12 3v4m0 0L9 9m3-2l3 2"
        />
      </svg>
    ),
    gradient: 'from-cyan-400 to-blue-500',
    bgLight: 'bg-cyan-50',
    bgDark: 'bg-cyan-900/20',
    borderActive: 'border-cyan-500',
  },
  {
    value: 'safari-adventure',
    label: 'Safari & Adventure',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    gradient: 'from-emerald-400 to-green-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-900/20',
    borderActive: 'border-emerald-500',
  },
  {
    value: 'cultural-history',
    label: 'Cultural & History',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    ),
    gradient: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-900/20',
    borderActive: 'border-amber-500',
  },
  {
    value: 'family-kids',
    label: 'Family & Kids',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    gradient: 'from-pink-400 to-rose-500',
    bgLight: 'bg-pink-50',
    bgDark: 'bg-pink-900/20',
    borderActive: 'border-pink-500',
  },
] as const

// ─── Component ──────────────────────────────────────────────

interface ExcursionsShowcaseProps {
  excursions: Excursion[]
}

export function ExcursionsShowcase({ excursions }: ExcursionsShowcaseProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Group excursions by category
  const grouped = useMemo(() => {
    const map: Record<string, Excursion[]> = {}
    for (const exc of excursions) {
      const cat = exc.category || 'uncategorized'
      if (!map[cat]) map[cat] = []
      map[cat].push(exc)
    }
    return map
  }, [excursions])

  // Get filtered list
  const filtered = useMemo(() => {
    if (activeCategory === 'all') return excursions
    return grouped[activeCategory] || []
  }, [activeCategory, excursions, grouped])

  // Count per category
  const getCount = (catValue: string) => {
    if (catValue === 'all') return excursions.length
    return grouped[catValue]?.length || 0
  }

  const activeCat = categories.find((c) => c.value === activeCategory) || categories[0]

  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span
            className={`inline-block text-xs tracking-[0.35em] uppercase mb-4 font-medium ${
              isDark ? 'text-secondary' : 'text-accent'
            }`}
          >
            Explore by Category
          </span>
          <h2
            className={`text-3xl md:text-5xl font-serif font-light mb-5 ${
              isDark ? 'text-white' : 'text-dark'
            }`}
          >
            Choose Your <span className="text-gradient">Adventure</span>
          </h2>
          <div className="mx-auto w-16 h-0.5 bg-accent rounded-full" />
        </motion.div>

        {/* ── Category Tabs ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-14"
        >
          <div
            className={`inline-flex flex-wrap justify-center gap-2 p-2 rounded-2xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-light/50 border border-dark/5'
            }`}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.value
              const count = getCount(cat.value)

              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`
                    relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium
                    transition-all duration-300 whitespace-nowrap
                    ${
                      isActive
                        ? isDark
                          ? `bg-white/10 text-white border ${cat.borderActive} shadow-lg`
                          : `bg-white text-dark border ${cat.borderActive} shadow-lg`
                        : isDark
                          ? 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                          : 'text-dark/50 hover:text-dark/80 hover:bg-white/60 border border-transparent'
                    }
                  `}
                >
                  <span
                    className={`transition-colors duration-300 ${
                      isActive
                        ? isDark
                          ? 'text-secondary'
                          : 'text-primary'
                        : isDark
                          ? 'text-white/40'
                          : 'text-dark/40'
                    }`}
                  >
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${cat.gradient} text-white`
                          : isDark
                            ? 'bg-white/10 text-white/40'
                            : 'bg-dark/5 text-dark/40'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── Excursion Cards Grid ─────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {filtered.map((excursion, i) => (
                  <motion.div
                    key={excursion.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <ExcursionCard excursion={excursion} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div
                  className={`inline-block p-14 rounded-3xl border ${
                    isDark ? 'border-white/5 bg-white/[0.02]' : 'border-dark/5 bg-dark/[0.01]'
                  }`}
                >
                  <div className="text-5xl mb-4">{getEmptyEmoji(activeCategory)}</div>
                  <p
                    className={`text-xl font-serif font-light mb-2 ${
                      isDark ? 'text-white/60' : 'text-dark/60'
                    }`}
                  >
                    No {activeCat.label} yet
                  </p>
                  <p className={`text-sm ${isDark ? 'text-white/30' : 'text-dark/30'}`}>
                    New experiences are being curated for this category
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Stats Strip ─────────────────────────────────── */}
        {excursions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto`}
          >
            {categories
              .filter((c) => c.value !== 'all')
              .map((cat) => {
                const count = getCount(cat.value)
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`group relative p-6 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                        : 'bg-white border-dark/5 hover:shadow-lg hover:border-dark/10'
                    }`}
                  >
                    <div
                      className={`text-3xl font-serif font-light mb-1 bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}
                    >
                      {count}
                    </div>
                    <div
                      className={`text-xs tracking-wider uppercase ${
                        isDark ? 'text-white/40' : 'text-dark/40'
                      }`}
                    >
                      {cat.label}
                    </div>
                  </button>
                )
              })}
          </motion.div>
        )}
      </div>
    </section>
  )
}

// ─── Helpers ────────────────────────────────────────────────

// function getCategoryDescription(cat: string): string {
//   const descriptions: Record<string, string> = {
//     'sea-trips':
//       'Dive into crystal-clear waters, sail along breathtaking coastlines, and discover hidden coves on our premium maritime adventures.',
//     'safari-adventure':
//       'Embark on thrilling safaris through vast landscapes, encounter majestic wildlife, and experience the raw beauty of nature.',
//     'cultural-history':
//       'Journey through centuries of heritage, explore ancient wonders, and immerse yourself in the rich tapestry of local traditions.',
//     'family-kids':
//       'Create unforgettable memories with perfectly crafted adventures designed for families — safe, fun, and magical for all ages.',
//   }
//   return descriptions[cat] || ''
// }

function getEmptyEmoji(cat: string): string {
  const emojis: Record<string, string> = {
    'sea-trips': '🚤',
    'safari-adventure': '🦁',
    'cultural-history': '🏛️',
    'family-kids': '👨‍👩‍👧‍👦',
    all: '✨',
  }
  return emojis[cat] || '✨'
}
