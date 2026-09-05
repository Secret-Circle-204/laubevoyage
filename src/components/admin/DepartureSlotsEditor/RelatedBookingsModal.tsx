import React from 'react'
import type {
  AdminDepartureSlotDTO,
  AdminRelatedBookingDTO,
} from '@/application/actions/slot-management-actions'

export interface RelatedBookingsModalProps {
  slot: AdminDepartureSlotDTO | null
  bookings: AdminRelatedBookingDTO[]
  pagination: {
    totalDocs: number
    limit: number
    totalPages: number
    page: number
    hasPrevPage: boolean
    hasNextPage: boolean
  } | null
  loading: boolean
  currentPage: number
  onPageChange: (slot: AdminDepartureSlotDTO, page: number) => void
  onClose: () => void
}

export const RelatedBookingsModal: React.FC<RelatedBookingsModalProps> = ({
  slot,
  bookings,
  pagination,
  loading,
  currentPage,
  onPageChange,
  onClose,
}) => {
  if (!slot) return null

  return (
    <div className="dse-modal-overlay" onClick={onClose}>
      <div className="dse-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="dse-modal-header">
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              👥 Related Bookings — {slot.date} ({slot.formattedTime || slot.startTime})
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a0aec0' }}>
              Departure Slot #{slot.id} • {slot.departureId} • Total Affected:{' '}
              {pagination?.totalDocs ?? slot.referencedBookingsCount ?? 0}
            </p>
          </div>
          <button
            type="button"
            className="dse-btn dse-btn--secondary"
            onClick={onClose}
            style={{ padding: '4px 8px', fontSize: '14px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div
          className="dse-modal-body"
          style={{ maxHeight: '420px', overflowY: 'auto', padding: '16px 0' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#a0aec0' }}>
              Loading related bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#a0aec0' }}>
              No bookings found referencing this departure slot.
            </div>
          ) : (
            <table className="dse-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Paid / Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.bookingNumber}</strong>
                    </td>
                    <td>
                      <div>{b.customerName}</div>
                      {b.customerEmail && (
                        <div style={{ fontSize: '11px', color: '#a0aec0' }}>{b.customerEmail}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className="dse-badge dse-badge--override"
                        style={{ textTransform: 'capitalize' }}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                        {b.paymentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <strong>{b.amountPaid.toLocaleString()}</strong> /{' '}
                      {b.totalAmountEGP.toLocaleString()} EGP
                    </td>
                    <td>
                      <a
                        href={`/admin/collections/bookings/${b.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="dse-btn dse-btn--open"
                      >
                        Open Booking ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination for Related Bookings */}
        {pagination && pagination.totalPages > 1 && (
          <div
            className="dse-pagination"
            style={{
              borderTop: '1px solid var(--theme-elevation-150, #2d3748)',
              paddingTop: '12px',
              marginTop: '8px',
            }}
          >
            <span className="dse-pagination-info">
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
              {pagination.totalDocs} total bookings)
            </span>
            <div className="dse-pagination-actions">
              <button
                type="button"
                className="dse-btn dse-btn--secondary"
                disabled={!pagination.hasPrevPage || loading}
                onClick={() => onPageChange(slot, currentPage - 1)}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="dse-btn dse-btn--secondary"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => onPageChange(slot, currentPage + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        <div
          className="dse-modal-footer"
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}
        >
          <button type="button" className="dse-btn dse-btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
