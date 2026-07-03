'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Clock, MapPin, Star } from 'lucide-react'
import { Package, Media } from '@/payload-types'

interface ExtendedPackage extends Omit<Package, 'city' | 'hotels' | 'relatedDestination'> {
  moods?: { title: string }[] | string[]
  destination?: { name: string }
  overview?: string
  city?: (number | { id: number; name: string })[] | null
  hotels?: (number | { id: number; stars: number })[] | null
  relatedDestination?: number | { id: number; name: string } | null
}

interface FeaturedPackagesProps {
  packages: Package[]
}

const PackageCard = ({ pkg: basePkg, index }: { pkg: Package; index: number }) => {
  const pkg = basePkg as ExtendedPackage
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, margin: '-100px' })
  const [touched, setTouched] = useState(false)

  const images =
    (pkg.gallery?.map((g) => (typeof g === 'object' ? g : null)).filter(Boolean) as Media[]) || []
  const mainImage = (
    typeof pkg.heroImage === 'object' ? pkg.heroImage : images[0] || null
  ) as Media | null

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative h-[600px] w-full overflow-hidden rounded-4xl cursor-pointer ${touched ? 'is-touched' : ''}`}
      onTouchStart={() => setTouched(true)}
      onTouchEnd={() => setTouched(false)}
      onTouchCancel={() => setTouched(false)}
    >
      <Link href={`/packages/${pkg.slug}`} className="block h-full w-full">
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`h-full w-full relative transition-transform duration-700 ease-out ${touched ? 'scale-110' : ''} group-hover:scale-110`}
          >
            <Image
              src={mainImage?.url || '/no-image-available.png'}
              alt={mainImage?.alt || pkg.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-500 backdrop-blur-[2px] ${touched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            />
          </div>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-8 sm:p-10 text-white">
          {/* Top Section: Tags & Price */}
          <div
            className={`flex justify-between items-start transition-all duration-500 ease-out ${touched ? 'translate-y-0 opacity-100' : 'translate-y-[-20px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
          >
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium tracking-wider uppercase max-w-[150px] truncate">
                {(() => {
                  const dest = pkg.relatedDestination
                  return typeof dest === 'object' && dest !== null ? dest.name : 'Worldwide'
                })()}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-accent/90 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              <span>From</span>
              <span className="text-white">
                $
                {(() => {
                  const base = pkg.price || pkg.adultPrice || 0
                  if (pkg.dates && pkg.dates.length > 0) {
                    const prices = pkg.dates
                      .map((d: { adultPrice?: number | null }) => d.adultPrice ?? base)
                      .filter((p: number): p is number => p > 0)
                    return prices.length > 0
                      ? Math.min(...prices).toLocaleString()
                      : base.toLocaleString()
                  }
                  return base.toLocaleString()
                })()}
              </span>
            </div>
          </div>

          {/* Bottom Section: Title & Details */}
          <div
            className={`relative z-10 transform transition-transform duration-500 ${touched ? '-translate-y-4' : ''} group-hover:-translate-y-4`}
          >
            <div className="flex items-center gap-2 mb-3 text-white/70">
              <MapPin size={16} className="text-accent shrink-0" />
              <span className="text-sm tracking-widest uppercase truncate w-full">
                {(() => {
                  const cities = pkg.city
                  if (Array.isArray(cities) && cities.length > 0) {
                    return cities

                      .map((c) => (typeof c === 'object' && c !== null ? c.name : null))
                      .filter((name): name is string => Boolean(name))
                      .join(' → ')
                  }
                  return 'Worldwide'
                })()}
              </span>
            </div>

            <h3 className="font-serif text-3xl sm:text-4xl font-medium leading-tight mb-4 group-hover:text-white transition-colors line-clamp-2">
              {pkg.title}
            </h3>

            {/* Hidden Details: revealed on hover (desktop) or touch (mobile) */}
            <div
              className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${touched ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] group-hover:grid-rows-[1fr]'}`}
            >
              <div className="overflow-hidden">
                <p className="text-white/80 line-clamp-2 mb-6 font-light text-lg">{pkg.overview}</p>

                <div className="flex items-center justify-between border-t border-white/20 pt-6">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-accent" />
                      <span className="text-sm font-medium">
                        {pkg.duration
                          ? pkg.duration
                          : pkg.dates &&
                              pkg.dates.length > 0 &&
                              pkg.dates[0].startDate &&
                              pkg.dates[0].endDate
                            ? Math.ceil(
                                Math.abs(
                                  new Date(pkg.dates[0].endDate).getTime() -
                                    new Date(pkg.dates[0].startDate).getTime(),
                                ) /
                                  (1000 * 60 * 60 * 24),
                              ) + ' Days'
                            : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star size={18} className="text-accent" />
                      <span className="text-sm font-medium">
                        {pkg.hotels &&
                        pkg.hotels.length > 0 &&
                        typeof pkg.hotels[0] === 'object' &&
                        pkg.hotels[0] !== null
                          ? `${pkg.hotels[0].stars}-Star Hotel`
                          : 'Premium Stay'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 text-accent font-bold tracking-widest uppercase text-sm transition-transform duration-300 ${touched ? 'translate-x-2' : ''} group-hover:translate-x-2`}
                  >
                    Explore Journey <ArrowUpRight size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function FeaturedPackages({ packages }: FeaturedPackagesProps) {
  if (!packages || packages.length === 0) return null

  const isSlider = packages.length > 3

  return (
    <section className="py-24 sm:py-32 bg-stone-50 dark:bg-[#121212] overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4 block"
            >
              Curated For You
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-serif text-dark dark:text-white leading-tight"
            >
              Signature <span className="italic text-stone-400 dark:text-stone-600">Journeys</span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/packages">
              <button className="hidden md:flex items-center gap-2 px-8 py-4 border border-dark/10 dark:border-white/10 rounded-full hover:bg-dark hover:text-white dark:hover:bg-white dark:hover:text-dark transition-all duration-300 uppercase text-xs tracking-widest font-bold">
                View All Collections
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Packages Display */}
        {isSlider ? (
          <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar cursor-grab active:cursor-grabbing">
              {packages.map((pkg, idx) => (
                <div
                  key={pkg.id}
                  className="snap-center sm:snap-start shrink-0 w-[85vw] sm:w-[500px] lg:w-[600px]"
                >
                  <PackageCard pkg={pkg} index={idx} />
                </div>
              ))}
            </div>
            {/* Fade Out Edges for Premium Look on Desktop */}
            <div className="hidden sm:block absolute top-0 right-0 h-full w-32 bg-linear-to-l from-stone-50 dark:from-[#121212] to-transparent pointer-events-none" />
            <div className="hidden sm:block absolute top-0 left-0 h-full w-16 bg-linear-to-r from-stone-50 dark:from-[#121212] to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {packages.map((pkg, idx) => (
              <div key={pkg.id}>
                <PackageCard pkg={pkg} index={idx} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 md:hidden flex justify-center">
          <Link href="/packages">
            <button className="px-8 py-4 bg-dark text-white rounded-full uppercase text-xs tracking-widest font-bold">
              View All Collections
            </button>
          </Link>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
    </section>
  )
}
