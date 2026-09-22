'use client'

import React from 'react'
import type { TableCellProps } from '../types'

export const ThumbnailCell: React.FC<TableCellProps> = ({ row, field = 'hero' }) => {
  const mediaObj = row?.[field] || row?.thumbnail || row?.media || row?.gallery?.[0]
  
  let imageUrl: string | null = null
  if (typeof mediaObj === 'object' && mediaObj !== null) {
    imageUrl = mediaObj.sizes?.thumbnail?.url || mediaObj.url || null
  } else if (typeof mediaObj === 'string' && mediaObj.startsWith('/')) {
    imageUrl = mediaObj
  }

  return (
    <div className="ut-thumb">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={row?.title || 'Thumbnail'}
          loading="lazy"
        />
      ) : (
        <svg
          width="18"
          height="18"
          fill="none"
          stroke="#64748b"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}
    </div>
  )
}
