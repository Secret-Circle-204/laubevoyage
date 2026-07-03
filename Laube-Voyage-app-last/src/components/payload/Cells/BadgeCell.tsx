'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const BadgeCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { cellData } = props
  if (!cellData) return null

  const value = String(cellData)
  
  // Define colors based on brand identity (Soul of the Interface)
  const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    // Statuses
    'published': { bg: 'rgba(0, 174, 239, 0.08)', text: '#008bc0', border: 'rgba(0, 174, 239, 0.15)', dot: '#00aeef' },
    'draft': { bg: 'rgba(167, 170, 172, 0.1)', text: '#666', border: 'rgba(167, 170, 0172, 0.15)', dot: '#a7aaac' },
    'pending': { bg: 'rgba(46, 49, 146, 0.08)', text: '#2e3192', border: 'rgba(46, 49, 146, 0.15)', dot: '#2e3192' },
    
    // Featured / CTA
    'featured': { bg: 'rgba(245, 130, 32, 0.08)', text: '#d66a0a', border: 'rgba(245, 130, 32, 0.15)', dot: '#f58220' },
    
    // Categories
    'sea-trips': { bg: 'rgba(0, 174, 239, 0.08)', text: '#008bc0', border: 'rgba(0, 174, 239, 0.15)', dot: '#00aeef' },
    'safari-adventure': { bg: 'rgba(245, 130, 32, 0.08)', text: '#d66a0a', border: 'rgba(245, 130, 32, 0.15)', dot: '#f58220' },
    
    // Default
    'default': { bg: 'rgba(46, 49, 146, 0.05)', text: '#2e3192', border: 'rgba(46, 49, 146, 0.1)', dot: '#4448b0' },
  }

  const style = colorMap[value] || colorMap['default']

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {value.replace(/-/g, ' ')}
    </span>
  )
}

export default BadgeCell
