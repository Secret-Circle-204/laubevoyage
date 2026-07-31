'use client'

import React from 'react'

interface FlagProps {
  flagCode?: string
  alt?: string
  className?: string
}

export function Flag({ flagCode, alt = 'Flag', className = '' }: FlagProps) {
  if (!flagCode) {
    // Fallback: Globe icon when flagCode is missing
    return (
      <span className={`inline-flex items-center justify-center text-sm ${className}`} aria-label={alt}>
        🌐
      </span>
    )
  }

  // Pure CDN abstraction: URL building is isolated here
  const flagUrl = `https://flagcdn.com/w40/${flagCode.toLowerCase()}.png`

  return (
    <img
      src={flagUrl}
      alt={alt}
      className={`w-5 h-3.5 object-cover rounded-sm shadow-sm ${className}`}
      onError={(e) => {
        // Fallback on load error
        e.currentTarget.style.display = 'none'
        const parent = e.currentTarget.parentElement
        if (parent) {
          const fallback = document.createElement('span')
          fallback.innerText = '🌐'
          fallback.className = 'text-xs'
          parent.appendChild(fallback)
        }
      }}
    />
  )
}
