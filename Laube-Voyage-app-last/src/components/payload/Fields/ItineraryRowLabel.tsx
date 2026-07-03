'use client'

import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

interface ItineraryRowData {
  time?: string
  activity?: string
}

export default function ItineraryRowLabel() {
  const { data, rowNumber } = useRowLabel<ItineraryRowData>()

  const time = data?.time || ''
  const activity = data?.activity || `Item ${rowNumber}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          display: 'inline-block',
          backgroundColor: '#f58220',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '60px',
          textAlign: 'center',
        }}
      >
        {time || '--:--'}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>
        {activity.length > 50 ? `${activity.substring(0, 50)}...` : activity}
      </span>
    </div>
  )
}
