'use client'
import React from 'react'
import { useConfig } from '@payloadcms/ui'
import { EditIcon, EyeIcon } from 'lucide-react'

const ActionCell: React.FC<any> = (props) => {
  const { rowData, collectionConfig } = props
  const { config } = useConfig()
  
  const id = rowData?.id
  const collectionSlug = collectionConfig?.slug

  if (!id || !collectionSlug) return null

  const adminRoute = config?.routes?.admin || '/admin'
  const editUrl = `${adminRoute}/collections/${collectionSlug}/${id}`

  return (
    <div className="quick-actions-cell">
      <a
        href={editUrl}
        title="Edit Record"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'rgba(46, 49, 146, 0.05)',
          color: '#2e3192',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#2e3192'
          e.currentTarget.style.color = 'white'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(46, 49, 146, 0.05)'
          e.currentTarget.style.color = '#2e3192'
        }}
      >
        <EditIcon size={14} />
      </a>
      
      <a
        href={editUrl} // Defaulting to edit for now, can be changed to preview if supported
        title="Quick View"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'rgba(0, 174, 239, 0.05)',
          color: '#00aeef',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#00aeef'
          e.currentTarget.style.color = 'white'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(0, 174, 239, 0.05)'
          e.currentTarget.style.color = '#00aeef'
        }}
      >
        <EyeIcon size={14} />
      </a>
    </div>
  )
}

export default ActionCell
