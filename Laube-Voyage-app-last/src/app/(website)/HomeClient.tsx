'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'
import { VideoGallery } from '@/components/premium-ui/VideoGallery'
import { FeaturedPackages } from '@/components/premium-ui/FeaturedPackages'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import type { Destination, BlogPost, Media, Package } from '@/payload-types'

interface HomeClientProps {
  destinations: Destination[]
  blogPosts: BlogPost[]
  videoGallery?: Array<{
    title: string
    youtubeUrl: string
    description?: string | null
    category?: ('lifestyle' | 'testimonial' | 'event' | 'bts') | null
    thumbnail?: (number | null) | Media
    id?: string | null
  }> | null
  featuredPackages?: Package[]
}

export default function HomeClient({
  destinations,
  blogPosts,
  videoGallery,
  featuredPackages = [],
}: HomeClientProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = mounted ? theme === 'dark' : true

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use only first 3 destinations and blog posts for homepage highlights
  const featuredDestinations = destinations.slice(0, 3)
  const featuredPosts = blogPosts.slice(0, 3)

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-dark' : 'bg-background'} transition-colors duration-500`}
    >
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className={`absolute inset-0 ${isDark ? 'bg-linear-to-b from-dark via-dark/60 to-dark' : 'bg-linear-to-b from-dark/80 via-dark/40 to-dark/80'} z-10`}
        />
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury Resort"
            fill
            className="object-cover scale-110"
            priority
          />
        </div>

        <div className="relative z-20 container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up">
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-64 h-48 md:w-80 md:h-60 mb-4">
                <Image
                  src="/logos/LAube-Voyage-logo-name-white.svg"
                  alt="L'AUBE VOYAGE"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-16 bg-linear-to-r from-transparent to-accent" />
                <span className="text-white text-sm tracking-[0.3em] uppercase font-light">
                  Est. 1996
                </span>
                <div className="h-px w-16 bg-linear-to-l from-transparent to-accent" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-light max-w-2xl mx-auto text-white/60 mb-12 tracking-wide">
              Travel more, Worry less.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/packages">
                <button className="px-10 py-4 bg-accent text-white font-medium tracking-widest text-sm uppercase transition-all duration-500 hover:bg-primary shadow-xl">
                  Experiences
                </button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Loyalty / Welcome Section */}
      <section className={`py-20 ${isDark ? 'bg-dark' : 'bg-white'} border-b border-gray/10`}>
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fade-up">
            <div
              className={`p-8 md:p-12 rounded-3xl ${isDark ? 'bg-gray/5 border-gray/10' : 'bg-secondary/5 border-secondary/10'} border flex flex-col md:flex-row items-center justify-between gap-8`}
            >
              <div className="max-w-2xl text-center md:text-left">
                {user ? (
                  <>
                    <h2
                      className={`text-3xl font-serif font-light ${isDark ? 'text-white' : 'text-dark'} mb-4 capitalize`}
                    >
                      Welcome back,{' '}
                      <span className="text-accent">{user.name?.split(' ')[0] || 'Voyager'}</span>
                    </h2>
                    <p className="text-gray dark:text-gray/80">
                      Track your bookings, check your loyalty points, and plan your next
                      extraordinary escape from your personal dashboard.
                    </p>
                  </>
                ) : (
                  <>
                    <h2
                      className={`text-3xl font-serif font-light ${isDark ? 'text-white' : 'text-dark'} mb-4`}
                    >
                      Be a L&apos;aube Voyager Club member and{' '}
                      <span className="text-accent">get more benefits</span>
                    </h2>
                    <p className="text-gray dark:text-gray/80">
                      Become a member of L&apos;Aube Voyage to unlock exclusive benefits, earn
                      loyalty points on every journey, and receive priority access to our most
                      prestigious collections.
                    </p>
                  </>
                )}
              </div>
              <div className="shrink-0">
                <Link href={user ? '/dashboard' : '/login'}>
                  <button className="px-8 py-4 bg-primary text-white text-xs tracking-widest uppercase font-bold hover:bg-accent transition-all duration-500 rounded-full shadow-lg">
                    {user ? 'View My Journey' : "JOIN L'AUBE VOYAGE Club"}
                  </button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Featured Destinations Section */}
      <section className={`py-32 ${isDark ? 'bg-[#1a1718]' : 'bg-[#f5f5f5]'}`}>
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fade-up" className="text-center mb-20">
            <span className="text-accent text-sm tracking-[0.3em] uppercase mb-4 block">
              World Discovery
            </span>
            <h2
              className={`text-4xl md:text-5xl font-serif font-light ${isDark ? 'text-white' : 'text-dark'}`}
            >
              Explore Destinations
            </h2>
          </AnimatedSection>

          {featuredDestinations.length > 0 ? (
            <AnimatedContainer
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0"
              staggerDelay={0.1}
            >
              {featuredDestinations.map((dest) => (
                <Link key={dest.id} href={`/destinations/${dest.slug}`}>
                  <div className="group relative h-[500px] overflow-hidden cursor-pointer border-r border-dark/5 last:border-0">
                    <Image
                      src={
                        (typeof dest.image === 'object' && dest.image?.url) ||
                        'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031'
                      }
                      alt={dest.name}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-dark via-dark/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <p className="text-secondary text-xs tracking-[0.2em] uppercase mb-2">
                        {dest.country}
                      </p>
                      <h3 className="text-3xl font-serif text-white mb-4">{dest.name}</h3>
                      <span className="text-accent text-sm tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 uppercase">
                        Explore →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </AnimatedContainer>
          ) : (
            <p className="text-center text-gray italic">Discovering new destinations for you...</p>
          )}

          <div className="mt-16 text-center">
            <Link href="/destinations">
              <button
                className={`px-10 py-4 border ${isDark ? 'border-gray/30 text-white' : 'border-dark/20 text-dark'} text-xs tracking-widest uppercase hover:bg-accent hover:text-white transition-all`}
              >
                View All Destinations
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Packages Section */}
      {featuredPackages && featuredPackages.length > 0 && (
        <FeaturedPackages packages={featuredPackages} />
      )}

      {/* Video Gallery Section */}
      {videoGallery && videoGallery.length > 0 && (
        <VideoGallery
          videos={videoGallery}
          title="Experience Our World"
          subtitle="Immerse yourself in the destinations and experiences that await you through our curated video collection."
        />
      )}

      {/* Latest from Journal (Blog) Section */}
      <section className={`py-32 ${isDark ? 'bg-dark' : 'bg-white'}`}>
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fade-up" className="text-center mb-20">
            <span className="text-secondary text-sm tracking-[0.3em] uppercase mb-4 block">
              The Journal
            </span>
            <h2
              className={`text-4xl md:text-5xl font-serif font-light ${isDark ? 'text-white' : 'text-dark'}`}
            >
              Travel Stories
            </h2>
          </AnimatedSection>

          <AnimatedContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
            {featuredPosts.length > 0 ? (
              featuredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="group cursor-pointer">
                    <div className="relative h-80 overflow-hidden mb-6 rounded-xl">
                      <Image
                        // D:\Tuf Work\Programing\websites\Laube-Voyage-app\public\no-image-available.png
                        src={
                          (typeof post.featuredImage === 'object' && post.featuredImage?.url) ||
                          '/no-image-available.png'
                        }
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <p className="text-accent text-[10px] tracking-[0.2em] uppercase mb-2">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <h3
                      className={`text-xl font-serif ${isDark ? 'text-white' : 'text-dark'} mb-3 group-hover:text-primary transition-colors`}
                    >
                      {post.title}
                    </h3>
                    <p className="text-gray dark:text-gray/80 text-sm line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray italic col-span-3">
                Our authors are penning new stories...
              </p>
            )}
          </AnimatedContainer>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`py-32 ${isDark ? 'bg-accent' : 'bg-primary'} transition-colors`}>
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <AnimatedSection animation="fade-up">
            <h2 className="text-4xl md:text-6xl font-serif font-light text-white mb-8">
              Ready to Write Your{' '}
              <span className="dark:text-primary text-white italic">Next Chapter?</span>
            </h2>
            <p className="text-white/80 text-lg mb-12">
              Connect with our luxury travel designers today to begin crafting a journey as unique
              as you are.
            </p>
            <Link href="/contact">
              <button className="px-12 py-5 bg-white text-primary text-xs tracking-[0.2em] uppercase font-bold hover:bg-primary hover:text-white transition-all duration-500 rounded-full shadow-2xl">
                Start Your Consultation
              </button>
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
