import React from 'react'
import type { DepartureSlotsSummaryDTO } from '@/application/actions/slot-management-actions'

export interface DepartureSlotsSummaryProps {
  summary: DepartureSlotsSummaryDTO
}

export const DepartureSlotsSummary: React.FC<DepartureSlotsSummaryProps> = ({ summary }) => {
  return (
    <div className="dse-summary-grid">
      <div className="dse-stat-card">
        <span className="dse-stat-label">Upcoming Slots</span>
        <span className="dse-stat-val dse-stat-val--upcoming">{summary.upcomingCount}</span>
      </div>
      <div className="dse-stat-card">
        <span className="dse-stat-label">Available Seats</span>
        <span className="dse-stat-val dse-stat-val--available">
          {summary.totalAvailableSeats}
        </span>
      </div>
      <div className="dse-stat-card">
        <span className="dse-stat-label">Sold Tickets</span>
        <span className="dse-stat-val dse-stat-val--sold">{summary.totalSoldSeats}</span>
      </div>
      <div className="dse-stat-card">
        <span className="dse-stat-label">Reserved Holds</span>
        <span className="dse-stat-val dse-stat-val--reserved">{summary.totalReservedSeats}</span>
      </div>
    </div>
  )
}
