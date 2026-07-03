'use client'

import { useState } from 'react'
import { Star, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/premium-ui/Button'
import type { Excursion } from '@/payload-types'

interface ReviewModalProps {
  excursion: Excursion
  userId: number
  isReviewed: boolean
}

/**
 * مكون نموذج التقييم - يظهر كزر ثم يفتح modal للتقييم
 * Review Modal Component - Displays as button, opens modal for review submission
 */
export default function ReviewModal({ excursion, userId, isReviewed }: ReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0 || !title.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userId,
          excursion: excursion.id,
          rating,
          title: title.trim(),
          comment: comment.trim(),
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          setIsOpen(false)
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isReviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
        <Check size={14} />
        {excursion.title}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all"
      >
        <Star size={14} />
        {excursion.title}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white dark:bg-stone-900 rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white">
                  Thank You!
                </h3>
                <p className="text-stone-500 mt-2">Your review has been submitted for approval.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white mb-2 italic">
                  Rate Your Experience
                </h3>
                <p className="text-stone-500 text-sm mb-6">{excursion.title}</p>

                {/* Rating Stars */}
                <div className="flex gap-2 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={
                          i < (hoverRating || rating)
                            ? 'text-primary fill-primary'
                            : 'text-stone-300 dark:text-stone-600'
                        }
                      />
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div className="space-y-2 mb-4">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    Review Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience..."
                    className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Comment */}
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    Your Story
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share details about your experience..."
                    className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={rating === 0 || !title.trim() || isSubmitting}
                    className="flex-1 rounded-xl bg-primary text-secondary hover:bg-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      'Submit Review'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
