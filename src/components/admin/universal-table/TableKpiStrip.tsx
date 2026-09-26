'use client'

import React from 'react'
import { useListQuery } from '@payloadcms/ui'
import type { TableMetric } from './types'
import { tableTokens } from './tokens'

interface TableKpiStripProps {
  metrics?: TableMetric[]
}

function renderIcon(icon?: string) {
  switch (icon) {
    case 'bag':
      return (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      )
    case 'check':
      return (
        <svg width="18" height="18" fill="none" stroke="#34d399" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'alert':
      return (
        <svg width="18" height="18" fill="none" stroke="#fbbf24" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )
    case 'pin':
      return (
        <svg width="18" height="18" fill="none" stroke="#2E3191" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
        </svg>
      )
    case 'layers':
      return (
        <svg width="18" height="18" fill="none" stroke="#c084fc" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      )
    case 'creditCard':
      return (
        <svg width="18" height="18" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      )
    default:
      return null
  }
}

export const TableKpiStrip: React.FC<TableKpiStripProps> = ({ metrics }) => {
  const { refineListData } = useListQuery()
  if (!metrics || metrics.length === 0) return null

  return (
    <div className={tableTokens.kpiStrip}>
      {metrics.map((m) => {
        const hasAction = Boolean(m.onClick || m.whereFilter !== undefined || m.id === 'total')
        const handleCardClick = () => {
          if (m.onClick) {
            m.onClick()
          } else if (m.whereFilter !== undefined) {
            void refineListData({ where: m.whereFilter, page: 1 })
          } else if (m.id === 'total') {
            void refineListData({ where: undefined, page: 1 })
          }
        }

        return (
          <div
            key={m.id}
            className={`${tableTokens.kpiCard} ${hasAction ? 'cursor-pointer hover:border-amber-500/40 transition-all' : ''}`}
            onClick={hasAction ? handleCardClick : undefined}
            role={hasAction ? 'button' : undefined}
            tabIndex={hasAction ? 0 : undefined}
          >
          <div className={tableTokens.kpiCardContent}>
            {m.icon && <div className={tableTokens.kpiIcon}>{renderIcon(m.icon)}</div>}
            <div className={tableTokens.kpiText}>
              <div className={tableTokens.kpiStatRow}>
                {m.loading ? (
                  <span className={tableTokens.kpiSkeleton} aria-label="Loading metric" />
                ) : m.error ? (
                  <span className={tableTokens.kpiError} title={m.error}>
                    Unavailable
                  </span>
                ) : (
                  <span className={tableTokens.kpiValue}>{m.value ?? '—'}</span>
                )}
                {m.percentage !== undefined && !m.loading && (
                  <span className={tableTokens.kpiBadge}>{m.percentage}%</span>
                )}
              </div>
              <div className={tableTokens.kpiLabel}>{m.label}</div>
            </div>
          </div>

          {/* Mini progress bar if percentage is present */}
          {m.percentage !== undefined && (
            <div className={tableTokens.kpiBar}>
              <div
                className={tableTokens.kpiBarFill}
                style={{ width: `${Math.min(100, Math.max(0, m.percentage))}%` }}
              />
            </div>
          )}
        </div>
      )
    })}
    </div>
  )
}
