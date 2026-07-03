'use client'
import React from 'react'
import { useConfig } from '@payloadcms/ui'

const ListSummary: React.FC<any> = (props) => {
  const { collection } = props
  const { config } = useConfig()
  
  // Defensive check for collection
  if (!collection && !props.collectionSlug) {
      return null
  }

  // Get labels safely
  const collectionConfig = collection || config.collections.find(c => c.slug === props.collectionSlug)
  const labels = collectionConfig?.labels || { singular: 'Items', plural: 'Items' }
  
  return (
    <div
      className="payload-list-summary"
      style={{
        padding: '2.5rem 2rem',
        marginBottom: '1.5rem',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(46, 49, 146, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 15px 35px -10px rgba(46, 49, 146, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative gradient blur */}
      <div style={{
          position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(0,174,239,0.1) 0%, transparent 70%)',
          zIndex: 0
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
         <div style={{
             width: '45px', height: '45px', borderRadius: '12px', 
             background: 'linear-gradient(135deg, #2e3192 0%, #00aeef 100%)',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             fontSize: '20px', boxShadow: '0 5px 15px rgba(46,49,146,0.3)'
         }}>
             🚀
         </div>
         <h2 style={{ 
             margin: 0, fontSize: '22px', fontWeight: '900', 
             letterSpacing: '-0.5px' 
         }}>
            {labels.singular} Explorer
         </h2>
      </div>
      
      <p style={{ 
          margin: 0, fontSize: '15px', color: 'var(--theme-text-secondary)', 
          maxWidth: '650px', lineHeight: '1.6', position: 'relative', zIndex: 1
      }}>
        Professional management for your <strong>{labels.plural.toLowerCase()}</strong>. 
        Synchronized with the L&apos;AUBE VOYAGE cloud backend for instant updates across all traveler touchpoints.
      </p>
      
      <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00aeef' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Update Status</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2e3192' }}>Live Connection</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f58220' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Session</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2e3192' }}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListSummary
