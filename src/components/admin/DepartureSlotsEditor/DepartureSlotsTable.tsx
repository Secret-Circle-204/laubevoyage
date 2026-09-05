import React from 'react'
import type { AdminDepartureSlotDTO } from '@/application/actions/slot-management-actions'
import { DepartureSlotsRow } from './DepartureSlotsRow'

export interface DepartureSlotsTableProps {
  slots: AdminDepartureSlotDTO[]
  editingSlotId?: number
  cancellingId: number | null
  deletingId: number | null
  onStartEdit: (slot: AdminDepartureSlotDTO) => void
  onCancelSlot: (slot: AdminDepartureSlotDTO) => void
  onDeleteSlot: (slot: AdminDepartureSlotDTO) => void
  onOpenBookings: (slot: AdminDepartureSlotDTO) => void
  formatDate: (dateStr: string) => string
}

export const DepartureSlotsTable: React.FC<DepartureSlotsTableProps> = ({
  slots,
  editingSlotId,
  cancellingId,
  deletingId,
  onStartEdit,
  onCancelSlot,
  onDeleteSlot,
  onOpenBookings,
  formatDate,
}) => {
  return (
    <div className="dse-table-wrap">
      <table className="dse-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time & Timezone</th>
            <th>Price</th>
            <th>Total Cap</th>
            <th>Reserved</th>
            <th>Sold</th>
            <th>Capacity Available</th>
            <th>Lifecycle Status</th>
            <th>Version / ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <DepartureSlotsRow
              key={slot.id}
              slot={slot}
              isEditing={editingSlotId === slot.id}
              cancellingId={cancellingId}
              deletingId={deletingId}
              onStartEdit={onStartEdit}
              onCancelSlot={onCancelSlot}
              onDeleteSlot={onDeleteSlot}
              onOpenBookings={onOpenBookings}
              formatDate={formatDate}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
