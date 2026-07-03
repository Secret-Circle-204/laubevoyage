'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'
import { useConfig } from '@payloadcms/ui'

const RelationshipTagCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { cellData, field } = props
  const { config } = useConfig()
  const relationTo = (field as any).relationTo

  const isID = typeof cellData === 'string' || typeof cellData === 'number'
  const [doc, setDoc] = React.useState<any>(typeof cellData === 'object' ? cellData : null)
  const [loading, setLoading] = React.useState(isID && !!cellData)

  React.useEffect(() => {
    if (isID && cellData && relationTo) {
      const apiPath = config?.routes?.api || '/api'
      fetch(`${apiPath}/${relationTo}/${cellData}`)
        .then((res) => res.json())
        .then((data) => {
          setDoc(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [cellData, config, relationTo, isID])

  if (loading) return <span style={{ fontSize: '10px', color: '#999', paddingLeft: '12px' }}>Loading...</span>
  if (!cellData) return null

  const label = doc ? doc.title || doc.name || doc.id : String(cellData)

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '20px',
        background: 'rgba(46, 49, 146, 0.05)',
        border: '1px solid rgba(46, 49, 146, 0.1)',
        color: '#2e3192',
        fontSize: '11px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(46, 49, 146, 0.05)',
        margin: '2px 0'
      }}
    >
      <span style={{ 
          width: '6px', height: '6px', borderRadius: '50%', 
          background: '#00aeef', marginRight: '8px' 
      }}></span>
      {label}
    </div>
  )
}

export default RelationshipTagCell
