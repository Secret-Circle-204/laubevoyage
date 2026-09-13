import React from 'react'
import type { AdminDepartureSlotDTO } from '@/application/actions/slot-management-actions'

export interface DepartureSlotsRowProps {
  slot: AdminDepartureSlotDTO
  isEditing: boolean
  cancellingId: number | null
  deletingId: number | null
  onStartEdit: (slot: AdminDepartureSlotDTO) => void
  onCancelSlot: (slot: AdminDepartureSlotDTO) => void
  onDeleteSlot: (slot: AdminDepartureSlotDTO) => void
  onOpenBookings: (slot: AdminDepartureSlotDTO) => void
  formatDate: (dateStr: string) => string
}

function UsersIcon() {
  return (
    <svg style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'text-bottom', marginLeft: '4px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export const DepartureSlotsRow: React.FC<DepartureSlotsRowProps> = ({
  slot,
  isEditing,
  cancellingId,
  deletingId,
  onStartEdit,
  onCancelSlot,
  onDeleteSlot,
  onOpenBookings,
  formatDate,
}) => {
  const isCorrupted = !!slot.isCorrupted
  const isCancelled = slot.lifecycleStatus === 'cancelled' || slot.status === 'cancelled'
  const isStarted = slot.lifecycleStatus === 'started'
  const isCompleted = slot.lifecycleStatus === 'completed'

  return (
    <tr
      className={`${isCorrupted ? 'dse-row--corrupted' : isCancelled ? 'dse-row--cancelled' : ''} ${isCompleted ? 'dse-row--past' : ''} ${isEditing ? 'dse-row--edit-active' : ''}`}
      style={isCorrupted ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : undefined}
    >
      <td>
        <strong>{formatDate(slot.date)}</strong>
      </td>
      <td>
        <span>{slot.formattedTime || slot.startTime || '—'}</span>
        {slot.destinationTimezone && (
          <span className="dse-meta" style={{ display: 'block', fontSize: '10px' }}>
            {slot.destinationTimezone}
          </span>
        )}
      </td>
      <td>
        <span>
          {slot.priceOverrideEGP !== undefined
            ? `${slot.priceOverrideEGP.toLocaleString()} EGP`
            : 'Base Price'}
        </span>
        {slot.priceOverrideEGP !== undefined && (
          <span className="dse-tag dse-tag--override">Override</span>
        )}
      </td>
      <td>{slot.capacityTotal}</td>
      <td>{slot.capacityReserved}</td>
      <td>{slot.capacitySold}</td>
      <td>
        <span
          className={`dse-badge ${slot.capacityAvailable > 0 ? 'dse-badge--available' : 'dse-badge--sold_out'}`}
        >
          {slot.capacityAvailable} Available
        </span>
      </td>
      <td>
        {isCorrupted ? (
          <span
            className="dse-badge"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
            title={slot.corruptionReason}
          >
            Corrupted • Invalid
          </span>
        ) : isCancelled ? (
          <span className="dse-badge dse-badge--cancelled">Cancelled</span>
        ) : isStarted ? (
          <span className="dse-badge dse-badge--override">Started</span>
        ) : isCompleted ? (
          <span className="dse-badge dse-badge--sold_out">Completed</span>
        ) : slot.capacityAvailable > 0 ? (
          <span className="dse-badge dse-badge--available">Upcoming • Available</span>
        ) : (
          <span className="dse-badge dse-badge--sold_out">Upcoming • Sold Out</span>
        )}
      </td>
      <td>
        <span className="dse-meta">
          v{slot.version} • {slot.departureId}
        </span>
      </td>
      <td>
        <div className="dse-actions-cell">
          {/* 1. Edit Button: ONLY for Upcoming */}
          {!isCancelled && !isStarted && !isCompleted && (
            <button
              type="button"
              className="dse-btn dse-btn--edit"
              onClick={() => onStartEdit(slot)}
            >
              Edit
            </button>
          )}

          {/* 2. Open ↗ Button: Always visible */}
          <a
            href={`/admin/collections/departure-slots/${slot.id}`}
            target="_blank"
            rel="noreferrer"
            className="dse-btn dse-btn--open"
          >
            Open ↗
          </a>

          {/* 3. Cancel Button: ONLY for Upcoming */}
          {!isCancelled && !isStarted && !isCompleted && (
            <button
              type="button"
              className="dse-btn dse-btn--cancel"
              onClick={() => onCancelSlot(slot)}
              disabled={cancellingId === slot.id || slot.canCancel === false}
              title="Cancel departure slot (disables public availability)"
            >
              {cancellingId === slot.id ? 'Cancelling...' : 'Cancel'}
            </button>
          )}

          {/* 4. Bookings (N) Button: Rendered whenever there are bookings */}
          {(slot.referencedBookingsCount ?? 0) > 0 && (
            <button
              type="button"
              className="dse-btn dse-btn--secondary"
              style={{ borderColor: '#6366f1', color: '#6366f1', fontWeight: 600 }}
              onClick={() => onOpenBookings(slot)}
              title="View affected / related bookings for this departure slot"
            >
              <span>Bookings ({slot.referencedBookingsCount})</span>
              <UsersIcon />
            </button>
          )}

          {/* 5. Delete Button: ONLY if isDeletable is true (0 bookings, 0 sold, 0 reserved) */}
          {slot.isDeletable && (
            <button
              type="button"
              className="dse-btn dse-btn--cancel"
              style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
              onClick={() => onDeleteSlot(slot)}
              disabled={deletingId === slot.id}
              title="Permanently delete unreferenced departure slot"
            >
              {deletingId === slot.id ? 'Deleting...' : 'Delete'}
            </button>
          )}

          {/* 6. Protected History Indicator: For Cancelled slots with historical references */}
          {isCancelled && !slot.isDeletable && (
            <span
              className="dse-badge dse-badge--cancelled"
              style={{ fontSize: '11px', opacity: 0.8, display: 'inline-flex', alignItems: 'center' }}
              title="Cannot delete: Historical booking records reference this slot"
            >
              <LockIcon />
              <span>Protected History</span>
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
