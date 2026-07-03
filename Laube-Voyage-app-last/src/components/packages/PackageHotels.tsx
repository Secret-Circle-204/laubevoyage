'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Hotel, Media } from '@/payload-types'
import { Star, Wifi, Utensils, Waves, Dumbbell, Sparkles, MapPin, Coffee } from 'lucide-react'
import { useState } from 'react'
import { HotelModal } from './HotelModal'

interface PackageHotelsProps {
  hotels: (Hotel | string | number)[]
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

export function PackageHotels({ hotels }: PackageHotelsProps) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter out ID-only relations, keep populated objects
  const populatedHotels = hotels.filter((h): h is Hotel => typeof h === 'object')

  if (populatedHotels.length === 0) return null

  return (
    <div className="space-y-16">
      <div className="flex items-end justify-between border-b border-stone-200 dark:border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-2">
            Premium <span className="text-secondary">Accommodation</span>
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            Handpicked stays for an unforgettable experience.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {populatedHotels.map((hotel, index) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            index={index}
            onOpenModal={() => {
              setSelectedHotel(hotel)
              setIsModalOpen(true)
            }}
          />
        ))}
      </div>

      <HotelModal
        hotel={selectedHotel}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

function HotelCard({
  hotel,
  index,
  onOpenModal,
}: {
  hotel: Hotel
  index: number
  onOpenModal: () => void
}) {
  const [activeImage, setActiveImage] = useState(0)
  const images = hotel.images?.map((img) => img.image as Media).filter(Boolean) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      className="group"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Images Column */}
        <div className="lg:col-span-7 relative">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-2xl">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[activeImage]?.url || ''}
                  alt={images[activeImage]?.alt || hotel.name}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />

                {/* Image Navigation Dots */}
                {images.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault()
                          setActiveImage(idx)
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 drop-shadow-lg ${
                          activeImage === idx ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white/80'
                        }`}
                        aria-label={`View image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                <span className="text-stone-400">No images available</span>
              </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

            {/* Floating Info */}
            <div className="absolute bottom-6 left-6 z-10 m-0">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={`${
                      i < (hotel.stars || 0)
                        ? 'fill-secondary text-secondary'
                        : 'fill-transparent text-stone-400'
                    }`}
                  />
                ))}
              </div>
              <h3 className="text-3xl font-serif font-bold text-white tracking-wide drop-shadow-md">
                {hotel.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div className="lg:col-span-5 flex flex-col h-full justify-center lg:py-4 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary dark:text-secondary">
              <MapPin size={18} />
              <span className="text-sm uppercase tracking-widest font-bold">{hotel.location}</span>
            </div>

            {/* Amenities Grid */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-stone-100 dark:border-white/5">
              {hotel.amenities?.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity] || Sparkles
                return (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 text-stone-600 dark:text-stone-300"
                  >
                    <div className="p-2 rounded-full bg-primary/5 dark:bg-white/5 text-primary dark:text-secondary group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {AMENITY_LABELS[amenity] || amenity}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* <div className="text-stone-500 dark:text-stone-400 leading-relaxed font-light"> */}
            {/* We'll assume rich text is rendered externally, but for now simple check */}
            {/* In a real scenario, use a RichText renderer here */}
            {/* <p className="line-clamp-4">
                Experience world-class service and luxury at {hotel.name}. Nestled in{' '}
                {hotel.location}, this {hotel.stars}-star haven offers an perfect blend of comfort
                and elegance.
              </p> */}
            {/* </div> */}
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenModal}
              className="text-secondary dark:text-white text-xs font-black uppercase tracking-[0.25em] hover:text-primary transition-colors flex items-center gap-2 group/btn"
            >
              View Hotel Details
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
