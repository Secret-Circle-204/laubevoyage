'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Destination } from '@/payload-types'

interface DestinationCardProps {
  destination: Destination
}

export function DestinationCard({ destination }: DestinationCardProps) {
  const imageObj = typeof destination.image === 'object' ? destination.image : undefined
  const imageUrl =
    imageObj?.url ||
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop'

  return (
    <Link href={`/destinations/${destination.slug}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer"
      >
        <Image
          src={imageUrl}
          alt={destination.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-dark via-dark/30 to-transparent" />

        {/* Region Badge */}
        <div className="absolute top-4 left-4">
          {/* <span className="px-3 py-1 text-xs uppercase tracking-widest text-white/90 font-medium bg-white/20 backdrop-blur-md rounded-full">
            {regionLabels[destination.region] || destination.region}
          </span> */}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className="text-secondary text-xs tracking-widest uppercase mb-1 block">
            {destination.country}
          </span>
          <h3 className="text-2xl font-serif font-light text-white mb-2 group-hover:text-accent transition-colors duration-300">
            {destination.name}
          </h3>

          <div className="flex items-center gap-2 text-white/70 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Explore</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
