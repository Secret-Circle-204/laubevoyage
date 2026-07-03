'use client'

import React, { useState, useCallback } from 'react'
import { useForm, useField } from '@payloadcms/ui'

interface ItineraryItem {
  time?: string
  activity?: string
}

export default function BulkItineraryInput() {
  const { dispatchFields: _dispatchFields } = useForm()

  const { value, setValue } = useField<ItineraryItem[]>({ path: 'itinerary' })
  const [bulkText, setBulkText] = useState('')

  const handleParse = useCallback(() => {
    if (!bulkText.trim()) return

    // Split by newlines and filter out empty lines
    const lines = bulkText.split('\n').filter((line) => line.trim() !== '')
    const newItems: { time: string; activity: string; id: string }[] = []

    lines.forEach((line) => {
      // Robust regex to split time and activity
      // Matches formats like "09:00 - Activity", "09:00 AM: Activity", "09:00 Activity"
      const match = line.match(/^(\d{1,2}:\d{2}(?:\s?[aApP][mM])?)\s*[-:]?\s*(.*)$/i)

      if (match) {
        newItems.push({
          time: match[1].trim(),
          activity: match[2].trim(),
          id: Math.random().toString(36).substring(7), // Generate unique ID for Payload array
        })
      } else {
        // If no time pattern found, put the whole line as activity with an empty time or a default
        newItems.push({
          time: '',
          activity: line.trim(),
          id: Math.random().toString(36).substring(7),
        })
      }
    })

    if (newItems.length > 0) {
      // Merge with existing items or replace entirely (replacing entirely is usually better for bulk)
      const currentItems = Array.isArray(value) ? value : []
      setValue([...currentItems, ...newItems])
      setBulkText('') // Clear the text area after successful parse
    }
  }, [bulkText, setValue, value])

  return (
    <div
      style={{
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(245, 130, 32, 0.05)',
        border: '1px solid rgba(245, 130, 32, 0.2)',
        borderRadius: '8px',
      }}
    >
      <h4
        style={{
          margin: '0 0 0.5rem 0',
          color: '#f58220',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        🚀 Fast Bulk Input (Optional)
      </h4>
      <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: '#666' }}>
        Paste your full itinerary here (e.g. &quot;09:00 AM - Hotel Pickup&quot;). We will
        automatically extract the time and activity to fill the fields below.
      </p>

      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder="09:00 - Meet at the lobby&#10;10:30 AM - Visit the Pyramids&#10;13:00 - Local Lunch"
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          marginBottom: '1rem',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontFamily: 'monospace',
          fontSize: '14px',
          backgroundColor: 'var(--theme-elevation-50)',
        }}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={(e) => {
            e.preventDefault()
            handleParse()
          }}
          disabled={!bulkText.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: !bulkText.trim() ? '#ccc' : '#f58220',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !bulkText.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          Parse & Add to Itinerary
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            setBulkText('')
          }}
          disabled={!bulkText}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: !bulkText ? '#ccc' : '#333',
            border: `1px solid ${!bulkText ? '#ccc' : '#ccc'}`,
            borderRadius: '4px',
            cursor: !bulkText ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
