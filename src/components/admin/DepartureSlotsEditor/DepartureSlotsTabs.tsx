import React from 'react'
import type { DepartureSlotsSummaryDTO } from '@/application/actions/slot-management-actions'
import type { DepartureSlotsTab } from './DepartureSlotsTypes'

export interface DepartureSlotsTabsProps {
  activeTab: DepartureSlotsTab
  summary: DepartureSlotsSummaryDTO
  loading: boolean
  loadingHistorical: boolean
  onTabChange: (tab: DepartureSlotsTab) => void
  onRefresh: () => void
}

function AlertTriangleIcon() {
  return (
    <svg style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function RotateCcwIcon() {
  return (
    <svg style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

export const DepartureSlotsTabs: React.FC<DepartureSlotsTabsProps> = ({
  activeTab,
  summary,
  loading,
  loadingHistorical,
  onTabChange,
  onRefresh,
}) => {
  return (
    <div className="dse-controls">
      <div className="dse-tabs">
        <button
          type="button"
          className={`dse-tab ${activeTab === 'upcoming' ? 'dse-tab--active' : ''}`}
          onClick={() => onTabChange('upcoming')}
        >
          Upcoming ({summary.upcomingCount})
        </button>
        <button
          type="button"
          className={`dse-tab ${activeTab === 'started' ? 'dse-tab--active' : ''}`}
          onClick={() => onTabChange('started')}
        >
          Started ({summary.startedCount})
        </button>
        <button
          type="button"
          className={`dse-tab ${activeTab === 'completed' ? 'dse-tab--active' : ''}`}
          onClick={() => onTabChange('completed')}
        >
          Completed ({summary.completedCount})
        </button>
        <button
          type="button"
          className={`dse-tab ${activeTab === 'cancelled' ? 'dse-tab--active' : ''}`}
          onClick={() => onTabChange('cancelled')}
        >
          Cancelled ({summary.cancelledCount})
        </button>
        <button
          type="button"
          className={`dse-tab ${activeTab === 'all' ? 'dse-tab--active' : ''}`}
          onClick={() => onTabChange('all')}
        >
          All ({summary.totalCount})
        </button>
        {summary.corruptedCount > 0 && (
          <button
            type="button"
            className={`dse-tab ${activeTab === 'corrupted_invariant' ? 'dse-tab--active' : ''}`}
            style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
            onClick={() => onTabChange('corrupted_invariant')}
          >
            <AlertTriangleIcon />
            <span>Corrupted ({summary.corruptedCount})</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className="dse-btn dse-btn--secondary"
        onClick={onRefresh}
        disabled={loading || loadingHistorical}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <RotateCcwIcon />
        <span>{loading || loadingHistorical ? 'Refreshing...' : 'Refresh Slots'}</span>
      </button>
    </div>
  )
}
