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
            style={{ color: '#ef4444', fontWeight: 600 }}
            onClick={() => onTabChange('corrupted_invariant')}
          >
            ⚠️ Corrupted ({summary.corruptedCount})
          </button>
        )}
      </div>

      <button
        type="button"
        className="dse-btn dse-btn--secondary"
        onClick={onRefresh}
        disabled={loading || loadingHistorical}
      >
        {loading || loadingHistorical ? 'Refreshing...' : '↻ Refresh Slots'}
      </button>
    </div>
  )
}
