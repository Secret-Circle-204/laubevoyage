'use client'

import React from 'react'

interface SmartMapLinkProps {
  data?: {
    location?: string | null
  }
}

export const SmartMapLink: React.FC<SmartMapLinkProps> = ({ data }) => {
  const location = data?.location

  if (!location) {
    return (
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#A7AAAC italic' }}>
        📍 Enter a location to enable Smart Maps
      </div>
    )
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

  return (
    <div style={{ marginTop: '10px' }}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          color: '#00AEEF',
          fontSize: '12px',
          textDecoration: 'underline',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        📍 View location on Smart Maps
      </a>
    </div>
  )
}

export default SmartMapLink
