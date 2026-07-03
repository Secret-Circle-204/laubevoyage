'use client'
import React, { useEffect, useState } from 'react'
import { useConfig } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

const ThumbnailCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { cellData } = props
  const { config } = useConfig()
  
  // cellData will be the ID (string/number) or the populated media object
  const [media, setMedia] = useState<any>(typeof cellData === 'object' ? cellData : null)
  const isID = typeof cellData === 'string' || typeof cellData === 'number'
  const [loading, setLoading] = useState(isID && !!cellData)

  useEffect(() => {
    // If it's a string or number (ID), we fetch it manually using the correct API path from config
    if (isID && cellData) {
      const apiPath = config?.routes?.api || '/api'
      const fetchMedia = async () => {
        try {
          const response = await fetch(`${apiPath}/media/${cellData}`)
          if (response.ok) {
            const data = await response.json()
            setMedia(data)
          }
        } catch (error) {
          console.error('Error fetching media for thumbnail:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchMedia()
    } else if (typeof cellData === 'object' && cellData) {
        setMedia(cellData)
        setLoading(false)
    }
  }, [cellData, config, isID])

  
  const src = media?.sizes?.thumbnail?.url || media?.url || ''
  const alt = media?.alt || 'Thumbnail'

  if (loading) {
      return (
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px', 
            backgroundColor: 'var(--theme-elevation-100)',
            animation: 'pulse 1.5s infinite ease-in-out',
            marginRight: '12px'
          }}>
              <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
          </div>
      )
  }

  return (
    <div
      className="thumbnail-cell-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: 'var(--theme-elevation-100)',
        border: '1px solid rgba(46, 49, 146, 0.1)',
        marginRight: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}
    >
      <style>{`
        .thumbnail-cell-container:hover {
          transform: scale(1.1) rotate(2deg);
          box-shadow: 0 0 15px rgba(0, 174, 239, 0.4);
          border-color: #00aeef;
          z-index: 100;
        }
      `}</style>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{ 
            fontSize: '9px', color: '#a7aaac', fontWeight: 'bold',
            textAlign: 'center', letterSpacing: '0.5px' 
        }}>
          {cellData ? 'NO IMG' : 'EMPTY'}
        </div>
      )}
    </div>
  )
}


export default ThumbnailCell
