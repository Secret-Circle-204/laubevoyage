'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { syncExchangeRatesAdminAction } from '@/application/actions/currency-admin-actions'

type SyncState = 'idle' | 'syncing' | 'success' | 'busy' | 'error'

export const SyncExchangeRatesButton: React.FC = () => {
  const router = useRouter()
  const [state, setState] = useState<SyncState>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSync = async () => {
    setState('syncing')
    setFeedback(null)

    try {
      const result = await syncExchangeRatesAdminAction()

      if (result.success) {
        setState('success')
        setFeedback(result.message || 'Exchange rates synchronized successfully across all providers.')
        router.refresh()
      } else if (result.code === 'JOB_LEASE_LOCKED') {
        setState('busy')
        setFeedback(result.message || 'Synchronization is currently in progress or lease is locked by another process.')
      } else {
        setState('error')
        setFeedback(result.message || 'Failed to synchronize exchange rates.')
      }
    } catch (err: unknown) {
      setState('error')
      setFeedback(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        borderRadius: '8px',
        backgroundColor: 'var(--theme-elevation-50, #f9fafb)',
        border: '1px solid var(--theme-elevation-150, #e5e7eb)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--theme-elevation-900, #111827)',
            }}
          >
            Exchange Rate Synchronization Engine
          </h4>
          <p
            style={{
              margin: '0.2rem 0 0 0',
              fontSize: '0.8rem',
              color: 'var(--theme-elevation-500, #6b7280)',
            }}
          >
            Trigger live provider failover sync, PostgreSQL persistence, and distributed cluster cache invalidation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={state === 'syncing'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: state === 'syncing' ? 'var(--theme-elevation-400, #9ca3af)' : 'var(--theme-primary-600, #2563eb)',
            border: 'none',
            borderRadius: '6px',
            cursor: state === 'syncing' ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease-in-out',
          }}
        >
          {state === 'syncing' ? (
            <>
              <svg
                style={{
                  width: '14px',
                  height: '14px',
                  animation: 'spin 1s linear infinite',
                }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="30 60"
                />
              </svg>
              <span>Syncing Rates...</span>
            </>
          ) : (
            <>
              <svg
                style={{ width: '14px', height: '14px' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Sync Exchange Rates Now</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor:
              state === 'success'
                ? 'var(--theme-success-50, #ecfdf5)'
                : state === 'busy'
                  ? 'var(--theme-warning-50, #fffbeb)'
                  : 'var(--theme-error-50, #fef2f2)',
            color:
              state === 'success'
                ? 'var(--theme-success-700, #047857)'
                : state === 'busy'
                  ? 'var(--theme-warning-700, #b45309)'
                  : 'var(--theme-error-700, #b91c1c)',
            border: `1px solid ${
              state === 'success'
                ? 'var(--theme-success-200, #a7f3d0)'
                : state === 'busy'
                  ? 'var(--theme-warning-200, #fde68a)'
                  : 'var(--theme-error-200, #fecaca)'
            }`,
          }}
        >
          <span>
            {state === 'success' ? '✓' : state === 'busy' ? '⚠️' : '✕'}
          </span>
          <span>{feedback}</span>
        </div>
      )}
    </div>
  )
}
