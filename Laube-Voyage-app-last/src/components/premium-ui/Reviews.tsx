'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({ rating, size = 'md', interactive = false, onChange }: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1)
    }
  }

  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, index) => (
        <button
          key={index}
          type={interactive ? 'button' : undefined}
          onClick={() => handleClick(index)}
          disabled={!interactive}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star
            className={`
              ${sizeClasses[size]}
              ${index < rating 
                ? 'fill-accent text-accent' 
                : 'fill-transparent text-gray/30 dark:text-gray/50'
              }
              transition-colors
            `}
          />
        </button>
      ))}
    </div>
  )
}

interface ReviewCardProps {
  review: {
    id: string
    user: { name: string }
    rating: number
    title: string
    comment: string
    tripDate?: string
    createdAt: string
    adminResponse?: string
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-6 bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-semibold text-primary">
              {review.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground dark:text-dark-foreground">
                {review.user.name}
              </p>
              <p className="text-xs text-gray">
                {review.tripDate ? `Traveled ${formatDate(review.tripDate)}` : formatDate(review.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      {/* Content */}
      <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
        {review.title}
      </h4>
      <p className="text-gray dark:text-gray/80 text-sm leading-relaxed">
        {review.comment}
      </p>

      {/* Admin Response */}
      {review.adminResponse && (
        <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 border-l-4 border-primary">
          <p className="text-xs font-semibold text-primary mb-1">
            Response from L&apos;Aube Voyage
          </p>
          <p className="text-sm text-foreground dark:text-dark-foreground">
            {review.adminResponse}
          </p>
        </div>
      )}
    </div>
  )
}

interface ReviewSummaryProps {
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
}

export function ReviewSummary({ averageRating, totalReviews, ratingDistribution }: ReviewSummaryProps) {
  return (
    <div className="p-6 bg-white dark:bg-dark-card border border-gray/10 dark:border-gray/20">
      <div className="flex items-start gap-8">
        {/* Average Rating */}
        <div className="text-center">
          <p className="text-5xl font-bold text-foreground dark:text-dark-foreground mb-2">
            {averageRating.toFixed(1)}
          </p>
          <StarRating rating={Math.round(averageRating)} size="md" />
          <p className="text-sm text-gray mt-2">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars] || 0
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
            
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray w-3">{stars}</span>
                <Star className="w-4 h-4 fill-accent text-accent" />
                <div className="flex-1 h-2 bg-gray/10 dark:bg-gray/20 overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray w-8">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
