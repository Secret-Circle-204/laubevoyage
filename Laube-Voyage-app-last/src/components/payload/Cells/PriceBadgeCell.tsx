'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const PriceBadgeCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { cellData } = props
  if (cellData === undefined || cellData === null) return null

  const price = Number(cellData)
  
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '4px',
        padding: '6px 12px',
        borderRadius: '10px',
        background: 'rgba(245, 130, 32, 0.05)',
        color: '#d66a0a',
        border: '1px solid rgba(245, 130, 32, 0.15)',
        fontWeight: '900',
        fontSize: '15px',
        boxShadow: '0 2px 4px rgba(245, 130, 32, 0.05)'
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: '700' }}>$</span>
      {price.toLocaleString()}
      <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: '700' }}>USD</span>
    </div>
  )
}


export default PriceBadgeCell
