'use client'

import React, { useState } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import {
  confirmAdminBookingAction,
  cancelAdminBookingAction,
  moveToPendingAdminReviewAction,
} from '@/application/actions/booking-actions'

export const BookingStatusField: SelectFieldClientComponent = (props) => {
  const { path } = props
  const { value, setValue } = useField<string>({ path })

  // Retrieve essential document fields from Payload Form State
  const bookingIdField = useFormFields(([fields]) => fields.id)
  const bookingId = bookingIdField?.value as number | undefined

  const pricingSnapshotField = useFormFields(([fields]) => fields.pricingSnapshot)
  const pricingSnapshot = pricingSnapshotField?.value as any | undefined

  const paymentAttemptsField = useFormFields(([fields]) => fields.paymentAttempts)
  const paymentAttempts = paymentAttemptsField?.value as any[] | undefined

  // Component UI States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)

  if (!bookingId) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          Booking Status
        </label>
        <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.85rem' }}>
          Save draft to enable status management actions.
        </div>
      </div>
    )
  }

  // Calculate dynamic outstanding balance
  const totalAmountEGP = pricingSnapshot?.totalAmountEGP || pricingSnapshot?.subtotalEGP || pricingSnapshot?.basePriceEGP || 0
  const paidEGP = (paymentAttempts || [])
    .filter((a: any) => a.status === 'successful')
    .reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
  const outstandingBalanceEGP = Math.max(0, totalAmountEGP - paidEGP)

  // Status Styling Config
  const getStatusColor = (statusVal: string) => {
    switch (statusVal) {
      case 'confirmed':
        return { bg: '#e6f4ea', text: '#137333', border: '#ceead6' }
      case 'pending_admin_review':
        return { bg: '#fef7e0', text: '#b06000', border: '#feebc8' }
      case 'pending_payment':
        return { bg: '#e8f0fe', text: '#1a73e8', border: '#d2e3fc' }
      case 'cancelled':
      case 'expired':
        return { bg: '#fce8e6', text: '#c5221f', border: '#fad2cf' }
      default:
        return { bg: '#f1f3f4', text: '#3c4043', border: '#e8eaed' }
    }
  }

  const statusStyle = getStatusColor(value || '')

  const handleSubmitForReview = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await moveToPendingAdminReviewAction({ bookingId })
      if (res.success) {
        setValue('pending_admin_review')
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Failed to submit booking for review.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBooking = async () => {
    if (depositAmount < 0 || depositAmount > outstandingBalanceEGP) {
      setErrorMsg(`Deposit must be between 0 and ${outstandingBalanceEGP} EGP.`)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await confirmAdminBookingAction({
        bookingId,
        depositAmount,
        currency: pricingSnapshot?.displayCurrency || 'EGP',
      })
      if (res.success) {
        setValue('confirmed')
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Failed to confirm booking.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await cancelAdminBookingAction({
        bookingId,
        reason: cancelReason || 'Cancelled during administrator review.',
      })
      if (res.success) {
        setValue('cancelled')
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Failed to cancel booking.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}>
      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
        Booking Status
      </label>

      {/* Styled Current Status Badge */}
      <div
        style={{
          display: 'inline-block',
          padding: '0.35rem 0.65rem',
          borderRadius: '4px',
          backgroundColor: statusStyle.bg,
          color: statusStyle.text,
          border: `1px solid ${statusStyle.border}`,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '1rem',
        }}
      >
        {value?.replace(/_/g, ' ') || 'DRAFT'}
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: '4px',
            backgroundColor: 'var(--theme-error-50)',
            border: '1px solid var(--theme-error-200)',
            color: 'var(--theme-error-700)',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            fontWeight: 500,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Action Panels */}
      {loading ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--theme-elevation-300)', borderTopColor: 'var(--theme-accent)', borderRadius: '50%' }} />
          Processing request...
        </div>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>
          {value === 'draft' && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem',
                backgroundColor: 'var(--theme-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              ⚡ Submit for Admin Review
            </button>
          )}

          {value === 'pending_admin_review' && (
            <div style={{ border: '1px solid var(--theme-elevation-150)', padding: '0.85rem', borderRadius: '6px', backgroundColor: 'var(--theme-elevation-50)' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--theme-elevation-500)', marginBottom: '0.2rem' }}>Financial Summary:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span>Total price:</span>
                  <span style={{ fontWeight: 600 }}>{totalAmountEGP.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span>Paid:</span>
                  <span style={{ fontWeight: 600, color: '#137333' }}>{paidEGP.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Outstanding:</span>
                  <span style={{ color: '#b06000' }}>{outstandingBalanceEGP.toLocaleString()} EGP</span>
                </div>
              </div>

              {outstandingBalanceEGP > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-elevation-600)', marginBottom: '0.25rem' }}>
                    Record Deposit Received (EGP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={outstandingBalanceEGP}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--theme-elevation-250)',
                      backgroundColor: 'var(--theme-elevation-0)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.8rem',
                    backgroundColor: '#137333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Approve & Confirm Reservation
                </button>

                {!showCancelPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem',
                      backgroundColor: '#c5221f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Cancel Booking
                  </button>
                ) : (
                  <div style={{ borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.55rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-elevation-600)', marginBottom: '0.25rem' }}>
                      Cancellation Reason:
                    </label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter reason..."
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-250)',
                        backgroundColor: 'var(--theme-elevation-0)',
                        fontSize: '0.8rem',
                        marginBottom: '0.45rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.6rem',
                          backgroundColor: '#c5221f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Confirm Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(false)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.6rem',
                          backgroundColor: 'var(--theme-elevation-200)',
                          color: 'var(--theme-elevation-800)',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Keep Booking
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
