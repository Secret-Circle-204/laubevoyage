'use client'

import React from 'react'

export interface RatingProps {
  value: number
  max?: number
  reviewsCount?: number
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  onChange?: (val: number) => void
  className?: string
}

export function Rating({
  value,
  max = 5,
  reviewsCount,
  size = 'md',
  readOnly = true,
  onChange,
  className = '',
}: RatingProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      {...(readOnly ? { role: 'img', 'aria-label': `Rating: ${value.toFixed(1)} out of ${max} stars` } : {})}
    >
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: max }).map((_, index) => {
          const filled = index + 1 <= Math.floor(value)
          const half = index < value && index + 1 > Math.floor(value)

          return (
            <button
              key={index}
              type="button"
              disabled={readOnly}
              aria-label={readOnly ? undefined : `Rate ${index + 1} out of ${max} stars`}
              tabIndex={readOnly ? -1 : 0}
              onClick={() => !readOnly && onChange?.(index + 1)}
              className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            >
              <svg
                className={`${sizeClasses[size]} ${filled || half ? 'fill-amber-400 text-amber-400' : 'fill-border text-border'}`}
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          )
        })}
      </div>

      <span className="text-xs sm:text-sm font-semibold text-foreground ml-0.5">
        {value.toFixed(1)}
      </span>

      {reviewsCount !== undefined && (
        <span className="text-xs text-muted">({reviewsCount})</span>
      )}
    </div>
  )
}
