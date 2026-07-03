'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReviewSummary, ReviewCard } from './Reviews'
import { ReviewForm } from './ReviewForm'
import { AnimatedSection } from './AnimatedSection'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

interface ReviewsSectionProps {
  excursionId: string
  excursionTitle: string
}

interface Review {
  id: string
  user: { name: string }
  rating: number
  title: string
  comment: string
  tripDate?: string
  createdAt: string
  adminResponse?: string
}

export function ReviewsSection({
  excursionId,
  excursionTitle,
}: ReviewsSectionProps) {
  const { user } = useAuth()
  const isLoggedIn = !!user
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0, ratingDistribution: {} })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/stats?excursion=${excursionId}`)
      const data = await res.json()
      if (res.ok) {
        setReviews(data.reviews || [])
        setStats({
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
          ratingDistribution: data.ratingDistribution || {},
        })
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }, [excursionId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3)

  if (loading) {
    return (
      <section className="py-16 bg-gray/5 dark:bg-dark-card/50">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray/20 rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-gray/20 rounded w-32 mx-auto" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray/5 dark:bg-dark-card/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fade-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-serif font-light text-foreground dark:text-dark-foreground flex items-center gap-3">
                <span className="w-8 h-0.5 bg-accent" />
                Guest Reviews
              </h2>
              <p className="text-gray mt-2">
                {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'} from our
                travelers
              </p>
            </div>

            {isLoggedIn && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
              >
                <MessageSquarePlus className="w-5 h-5" />
                Write a Review
              </button>
            )}
          </div>

          {/* Review Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <ReviewForm
                  excursionId={excursionId}
                  excursionTitle={excursionTitle}
                  onSuccess={() => {
                    setShowForm(false)
                    fetchReviews()
                  }}
                  onClose={() => setShowForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary & Reviews */}
          {stats.totalReviews > 0 ? (
            <div className="space-y-8">
              {/* Summary Card */}
              <ReviewSummary
                averageRating={stats.averageRating}
                totalReviews={stats.totalReviews}
                ratingDistribution={stats.ratingDistribution}
              />

              {/* Review List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {/* Show More */}
              {reviews.length > 3 && (
                <div className="text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="inline-flex items-center gap-2 text-primary dark:text-secondary hover:underline"
                  >
                    {showAll ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20">
              <p className="text-gray mb-4">
                No reviews yet. Be the first to share your experience!
              </p>
              {!isLoggedIn && (
                <p className="text-sm text-gray/70">
                  <a href="/login" className="text-primary hover:underline">
                    Log in
                  </a>{' '}
                  to write a review
                </p>
              )}
            </div>
          )}
        </AnimatedSection>
      </div>
    </section>
  )
}
