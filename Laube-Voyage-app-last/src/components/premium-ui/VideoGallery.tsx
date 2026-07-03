'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { Media } from '@/payload-types'

// --- Utility: Extract YouTube ID ---
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// --- Component: YouTube Embed ---
interface YouTubeEmbedProps {
  videoId: string
  title: string
  autoplay?: boolean
}

export function YouTubeEmbed({ videoId, title, autoplay = false }: YouTubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark/20 backdrop-blur-sm z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`}
        title={title}
        onLoad={() => setIsLoading(false)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

// --- Component: Video Card ---
interface VideoCardProps {
  video: {
    title: string
    youtubeUrl: string
    description?: string | null
    category?: ('lifestyle' | 'testimonial' | 'event' | 'bts') | null
    thumbnail?: (number | null) | Media
    id?: string | null
  }
  onPlay: () => void
  index: number
}

const categoryLabels: Record<string, string> = {
  lifestyle: 'Lifestyle',
  testimonial: 'Stories',
  event: 'Events',
  bts: 'Behind the Scenes',
}

export function VideoCard({ video, onPlay, index }: VideoCardProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? theme === 'dark' : true
  const videoId = extractYouTubeId(video.youtubeUrl)

  // High-res YouTube thumbnail fallback
  const thumbnailUrl =
    (typeof video.thumbnail === 'object' && video.thumbnail?.url) ||
    (videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : '/no-image-available.png')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group cursor-pointer flex flex-col h-full"
      onClick={onPlay}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4 shadow-lg group-hover:shadow-xl transition-all duration-500 ring-1 ring-white/10">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

        {/* Play Icon - Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:border-primary shadow-2xl">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Category Badge - Top Left */}
        {video.category && (
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md backdrop-blur-md shadow-sm border ${
                isDark
                  ? 'bg-black/50 text-white border-white/10'
                  : 'bg-white/90 text-dark border-dark/5'
              }`}
            >
              {categoryLabels[video.category] || video.category}
            </span>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col grow">
        <h3
          className={`text-lg font-serif font-medium leading-tight mb-2 transition-colors duration-300 ${
            isDark
              ? 'text-primary group-hover:text-primary-dark'
              : 'text-white group-hover:text-primary-light'
          }`}
        >
          {video.title}
        </h3>
        {video.description && (
          <p
            className={`text-sm leading-relaxed line-clamp-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {video.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// --- Main Gallery Component ---
interface VideoGalleryProps {
  videos: Array<{
    title: string
    youtubeUrl: string
    description?: string | null
    category?: ('lifestyle' | 'testimonial' | 'event' | 'bts') | null
    thumbnail?: (number | null) | Media
    id?: string | null
  }>
  title?: string
  subtitle?: string
}

export function VideoGallery({
  videos,
  title = 'Experience Our World',
  subtitle,
}: VideoGalleryProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeVideo, setActiveVideo] = useState<(typeof videos)[0] | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use server-side default (dark) to prevent hydration mismatch
  const isDark = mounted ? theme === 'dark' : true

  if (!videos || videos.length === 0) return null

  const activeVideoId = activeVideo ? extractYouTubeId(activeVideo.youtubeUrl) : null

  return (
    <section
      className={`py-24 transition-colors duration-500 ${isDark ? 'bg-gray-200' : 'bg-dark'}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className={`text-3xl md:text-5xl font-serif font-light mb-6 ${isDark ? 'text-dark' : 'text-white'}`}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={`text-lg font-light leading-relaxed ${isDark ? 'text-gray-600' : 'text-gray-200'}`}
              >
                {subtitle}
              </p>
            )}
            <div
              className={`h-1 w-24 mx-auto mt-8 rounded-full ${isDark ? 'bg-primary' : 'bg-primary'}`}
            />
          </motion.div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {videos.map((video, index) => (
            <VideoCard
              key={video.id || index}
              video={video}
              index={index}
              onPlay={() => setActiveVideo(video)}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {activeVideo && activeVideoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            {/* Backdrop with Blur */}
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setActiveVideo(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                {/* Modal Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-serif text-white mb-2">
                      {activeVideo.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:rotate-90"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                {/* Video Player */}
                <YouTubeEmbed videoId={activeVideoId} title={activeVideo.title} autoplay />

                {/* Description Footer */}
                {activeVideo.description && (
                  <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-3xl">
                    {activeVideo.description}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
