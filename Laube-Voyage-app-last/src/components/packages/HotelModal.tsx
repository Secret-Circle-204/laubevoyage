'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Star, Wifi, Utensils, Waves, Dumbbell, Sparkles, Coffee } from 'lucide-react'
import Image from 'next/image'
import { Hotel, Media } from '@/payload-types'
import { useState, useEffect, useCallback } from 'react'
import { SimpleRichText } from '@/components/ui/SimpleRichText'

interface HotelModalProps {
  hotel: Hotel | null
  isOpen: boolean
  onClose: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AMENITY_ICONS: Record<string, any> = {
  pool: Waves,
  spa: Sparkles,
  gym: Dumbbell,
  wifi: Wifi,
  restaurant: Utensils,
  'all-inclusive': Coffee,
}

const AMENITY_LABELS: Record<string, string> = {
  pool: 'Swimming Pool',
  spa: 'Luxury Spa',
  gym: 'Fitness Center',
  wifi: 'High-Speed WiFi',
  restaurant: 'Fine Dining',
  'all-inclusive': 'All Inclusive',
}

// Utility to wrap index
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

const swipeConfidenceThreshold = 10000
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity
}

export function HotelModal({ hotel, isOpen, onClose }: HotelModalProps) {
  const [[page, direction], setPage] = useState([0, 0])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Reset page when hotel changes
  useEffect(() => {
    setPage([0, 0])
  }, [hotel])

  const images = hotel?.images?.map((img) => img.image as Media).filter(Boolean) || []
  const imageIndex = wrap(0, images.length, page)

  const paginate = useCallback((newDirection: number) => {
    setPage(([prevPage]) => [prevPage + newDirection, newDirection])
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowLeft') paginate(-1)
      if (e.key === 'ArrowRight') paginate(1)
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, paginate])

  if (!hotel) return null

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 transition-opacity"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.1 }}
              className="bg-white dark:bg-[#1a1718] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-white/10 relative"
            >
              {/* Header Image Slider Area */}
              <div className="relative h-96 sm:min-h-[45vh] shrink-0 overflow-hidden bg-black group">
                {images.length > 0 ? (
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                      key={page}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={1}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = swipePower(offset.x, velocity.x)
                        if (swipe < -swipeConfidenceThreshold) {
                          paginate(1)
                        } else if (swipe > swipeConfidenceThreshold) {
                          paginate(-1)
                        }
                      }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <Image
                        src={images[imageIndex]?.url || ''}
                        alt={images[imageIndex]?.alt || hotel.name}
                        fill
                        className="object-cover"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="w-full h-full bg-stone-100 dark:bg-stone-800" />
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0"
                      onClick={() => paginate(-1)}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0"
                      onClick={() => paginate(1)}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>

                    {/* Dots Indicator */}
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                      {images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === imageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-colors z-20"
                >
                  <X size={24} />
                </button>

                <div className="absolute bottom-6 left-6 right-6 text-white z-10 pointer-events-none">
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < (hotel.stars || 0)
                            ? 'fill-secondary text-secondary'
                            : 'fill-transparent text-white/30'
                        }`}
                      />
                    ))}
                  </div>
                  <motion.h2
                    layoutId={`title-${hotel.id}`}
                    className="text-3xl sm:text-4xl font-serif font-bold tracking-wide"
                  >
                    {hotel.name}
                  </motion.h2>
                  <div className="flex items-center gap-2 mt-2 text-white/80">
                    <MapPin size={16} />
                    <span className="text-sm font-medium uppercase tracking-wider">
                      {hotel.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Main Content: Description */}
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-secondary mb-4">
                        About {hotel.name}
                      </h3>
                      <div className="prose prose-stone dark:prose-invert max-w-none text-stone-600 dark:text-stone-300 font-light leading-relaxed">
                        {hotel.description ? (
                          <div className="opacity-90">
                            <SimpleRichText content={hotel.description} />
                          </div>
                        ) : (
                          <p>Description not available.</p>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Sidebar: Amenities & Info */}
                  <div className="space-y-8">
                    <div className="bg-stone-50 dark:bg-white/5 p-6 rounded-2xl border border-stone-100 dark:border-white/5">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-secondary mb-6">
                        Amenities
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {hotel.amenities?.map((amenity) => {
                          const Icon = AMENITY_ICONS[amenity] || Sparkles
                          return (
                            <div
                              key={amenity}
                              className="flex items-center gap-3 text-stone-700 dark:text-stone-200"
                            >
                              <div className="p-2 rounded-full bg-white dark:bg-white/10 text-primary shadow-sm">
                                <Icon size={16} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {AMENITY_LABELS[amenity] || amenity}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-stone-200 dark:border-white/10 text-center">
                      <MapPin className="mx-auto text-secondary mb-3" size={24} />
                      <h4 className="font-serif text-lg text-dark dark:text-white mb-2">
                        Location
                      </h4>
                      <p className="text-sm text-stone-500 mb-4">{hotel.location}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.location}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                      >
                        View on Map
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
