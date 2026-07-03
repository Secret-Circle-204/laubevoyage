'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X } from 'lucide-react'
import { StarRating } from './Reviews'

interface ReviewFormProps {
  excursionId: string
  excursionTitle: string
  onSuccess?: () => void
  onClose?: () => void
}

export function ReviewForm({ excursionId, excursionTitle, onSuccess, onClose }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excursion: excursionId,
          rating,
          title,
          comment,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setRating(0)
        setTitle('')
        setComment('')
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to submit review')
        setStatus('error')
      }
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="p-6 bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
            Share Your Experience
          </h3>
          <p className="text-sm text-gray">
            {excursionTitle}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray/10 dark:hover:bg-gray/20 transition-colors"
          >
            <X className="w-5 h-5 text-gray" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
              Thank You for Your Review!
            </h4>
            <p className="text-sm text-gray">
              Your review is pending approval and will be visible soon.
            </p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-3">
                Your Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating rating={rating} size="lg" interactive onChange={setRating} />
                <span className="text-sm text-gray">
                  {rating === 0 ? 'Select a rating' : `${rating} star${rating > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-2">
                Review Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full px-4 py-3 bg-background dark:bg-dark-background border border-gray/20 dark:border-gray/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground dark:text-dark-foreground"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-2">
                Your Review *
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share the details of your experience..."
                className="w-full px-4 py-3 bg-background dark:bg-dark-background border border-gray/20 dark:border-gray/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-foreground dark:text-dark-foreground"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
