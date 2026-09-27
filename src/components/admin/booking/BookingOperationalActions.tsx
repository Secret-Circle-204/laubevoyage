'use client'

import React, { useState } from 'react'
import {
  confirmAdminBookingAction,
  cancelAdminBookingAction,
  moveToPendingAdminReviewAction,
  recordSubsequentPaymentAction,
  refundAdminBookingAction,
} from '@/application/actions/booking-actions'

function AlertTriangleIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function RotateCcwIcon() {
  return (
    <svg
      style={{
        width: '14px',
        height: '14px',
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        marginRight: '5px',
        flexShrink: 0,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

export interface BookingOperationalPricing {
  basePriceEGP?: number
  loyaltyDiscountEGP?: number
  totalAmountEGP?: number
  paidEGP?: number
  outstandingBalanceEGP?: number
  displayCurrency?: string
  paymentStatus?: string
}

export interface BookingOperationalActionsProps {
  bookingId: number
  status: string
  pricing: BookingOperationalPricing
  onActionSuccess: () => Promise<void> | void
  showStatusBadge?: boolean
  showFinancialSummary?: boolean
}

/**
 * Authoritative Booking Operational Actions Surface:
 * Single canonical owner of commercial action controls, input prompts,
 * state validation, and server action invocations.
 *
 * Shared symmetrically between:
 * 1. BookingStatusField (Payload Document Drawer)
 * 2. BookingPeekContent (Editorial Peek Drawer)
 */
export const BookingOperationalActions: React.FC<BookingOperationalActionsProps> = ({
  bookingId,
  status,
  pricing,
  onActionSuccess,
  showStatusBadge = false,
  showFinancialSummary = false,
}) => {
  const {
    basePriceEGP = 0,
    loyaltyDiscountEGP = 0,
    totalAmountEGP = 0,
    paidEGP = 0,
    outstandingBalanceEGP = 0,
    displayCurrency = 'EGP',
    paymentStatus = 'unpaid',
  } = pricing

  // UI Interactive States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Pending Admin Review States
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [depositInstrument] = useState<string>('manual')
  const [cancelReason, setCancelReason] = useState<string>('')
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)

  // Subsequent Payment States
  const [subsequentAmount, setSubsequentAmount] = useState<string>('')
  const [subsequentInstrument] = useState<string>('manual')

  // Refund States
  const [showRefundPrompt, setShowRefundPrompt] = useState(false)

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

  const statusStyle = getStatusColor(status || '')

  // 1. Submit for Admin Review Handler
  const handleSubmitForReview = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await moveToPendingAdminReviewAction({ bookingId })
      if (res.success) {
        await onActionSuccess()
      } else {
        setErrorMsg(res.error || 'Failed to submit booking for review.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Approve & Confirm Booking Handler
  const handleConfirmBooking = async () => {
    if (loading) return
    const depositToPay = depositAmount !== '' ? Number(depositAmount) : 0
    if (depositToPay < 0 || depositToPay > outstandingBalanceEGP) {
      setErrorMsg(`Deposit must be between 0 and ${outstandingBalanceEGP.toLocaleString()} EGP.`)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await confirmAdminBookingAction({
        bookingId,
        depositAmount: depositToPay,
        currency: displayCurrency,
        instrument: depositInstrument,
      })
      if (res.success) {
        await onActionSuccess()
      } else {
        setErrorMsg(res.error || 'Failed to confirm booking.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // 3. Cancel Booking Handler
  const handleCancelBooking = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await cancelAdminBookingAction({
        bookingId,
        reason: cancelReason || 'Cancelled during administrator review.',
      })
      if (res.success) {
        setShowCancelPrompt(false)
        await onActionSuccess()
      } else {
        setErrorMsg(res.error || 'Failed to cancel booking.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // 4. Subsequent Payment Handler
  const handleRecordSubsequentPayment = async () => {
    const amountToPay = subsequentAmount !== '' ? Number(subsequentAmount) : outstandingBalanceEGP
    if (amountToPay <= 0 || amountToPay > outstandingBalanceEGP) {
      setErrorMsg(`Payment amount must be between 1 and ${outstandingBalanceEGP.toLocaleString()} EGP.`)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await recordSubsequentPaymentAction({
        bookingId,
        amount: amountToPay,
        instrument: subsequentInstrument,
      })
      if (res.success) {
        setSubsequentAmount('')
        await onActionSuccess()
      } else {
        setErrorMsg(res.error || 'Failed to record payment.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // 5. Refund Handler
  const handleRefund = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await refundAdminBookingAction({
        bookingId,
      })
      if (res.success) {
        setShowRefundPrompt(false)
        await onActionSuccess()
      } else {
        setErrorMsg(res.error || 'Failed to process refund.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-body, 'Montserrat', sans-serif)", width: '100%' }}>
      {showStatusBadge && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
            Booking Status
          </label>
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
            }}
          >
            {status?.replace(/_/g, ' ') || 'DRAFT'}
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: '6px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.8rem',
            marginBottom: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <AlertTriangleIcon />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div
          style={{
            fontSize: '0.85rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid #cbd5e1',
              borderTopColor: '#2E3191',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span>Processing request...</span>
        </div>
      ) : (
        <div>
          {/* A. DRAFT STATE */}
          {status === 'draft' && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                backgroundColor: '#2E3191',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <SendIcon />
              <span>Submit for Admin Review</span>
            </button>
          )}

          {/* B. PENDING ADMIN REVIEW STATE */}
          {status === 'pending_admin_review' && (
            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              {showFinancialSummary && (
                <div style={{ fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  <div style={{ color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>Financial Summary:</div>
                  {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span>Base price:</span>
                        <span>{basePriceEGP.toLocaleString()} EGP</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.15rem',
                          color: '#137333',
                        }}
                      >
                        <span>Loyalty discount:</span>
                        <span>-{loyaltyDiscountEGP.toLocaleString()} EGP</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Net Total:</span>
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
              )}

              {/* Deposit Input Field */}
              {outstandingBalanceEGP > 0 && (
                <div
                  style={{
                    marginBottom: '0.75rem',
                    borderTop: showFinancialSummary ? '1px solid #f1f5f9' : 'none',
                    paddingTop: showFinancialSummary ? '0.5rem' : 0,
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Record Deposit Received (EGP):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={outstandingBalanceEGP}
                    placeholder="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: loading ? '#94a3b8' : '#137333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 1px 2px rgba(19, 115, 51, 0.2)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <CheckIcon />
                  <span>{loading ? 'Processing confirmation...' : 'Approve & Confirm Reservation'}</span>
                </button>

                {!showCancelPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.85rem',
                      backgroundColor: '#c5221f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <XIcon />
                    <span>Cancel Booking</span>
                  </button>
                ) : (
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.65rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Cancellation Reason:
                    </label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter reason..."
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.8rem',
                        color: '#0f172a',
                        marginBottom: '0.5rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.6rem',
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
                          padding: '0.45rem 0.6rem',
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
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

          {/* C. CONFIRMED STATE */}
          {status === 'confirmed' && (
            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              {showFinancialSummary && (
                <div style={{ fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  <div style={{ color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>Financial Summary:</div>
                  {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span>Base price:</span>
                        <span>{basePriceEGP.toLocaleString()} EGP</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.15rem',
                          color: '#137333',
                        }}
                      >
                        <span>Loyalty discount:</span>
                        <span>-{loyaltyDiscountEGP.toLocaleString()} EGP</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Net Total:</span>
                    <span style={{ fontWeight: 600 }}>{totalAmountEGP.toLocaleString()} EGP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Paid:</span>
                    <span style={{ fontWeight: 600, color: '#137333' }}>{paidEGP.toLocaleString()} EGP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Outstanding:</span>
                    <span style={{ fontWeight: 600, color: '#b06000' }}>
                      {outstandingBalanceEGP.toLocaleString()} EGP
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Financial Status:</span>
                    <span style={{ textTransform: 'uppercase', color: paymentStatus === 'paid' ? '#137333' : '#b06000' }}>
                      {paymentStatus || 'unpaid'}
                    </span>
                  </div>
                </div>
              )}

              {/* Subsequent Payment Option (when outstanding balance remains) */}
              {outstandingBalanceEGP > 0 && (
                <div
                  style={{
                    borderTop: showFinancialSummary ? '1px solid #f1f5f9' : 'none',
                    paddingTop: showFinancialSummary ? '0.75rem' : 0,
                    marginTop: showFinancialSummary ? '0.5rem' : 0,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#1e293b' }}>
                    Record Subsequent Payment
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Amount (EGP, max: {outstandingBalanceEGP.toLocaleString()}):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={outstandingBalanceEGP}
                      placeholder={outstandingBalanceEGP.toString()}
                      value={subsequentAmount}
                      onChange={(e) => setSubsequentAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.8rem',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRecordSubsequentPayment}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <CreditCardIcon />
                    <span>Record Payment</span>
                  </button>
                </div>
              )}

              {/* Refund Option (when payment has been made) */}
              {paidEGP > 0 && (
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.65rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {!showRefundPrompt ? (
                    <button
                      type="button"
                      onClick={() => setShowRefundPrompt(true)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#c5221f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <RotateCcwIcon />
                      <span>Issue Manual Refund ({paidEGP.toLocaleString()} EGP)</span>
                    </button>
                  ) : (
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#c5221f',
                          marginBottom: '0.4rem',
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        Are you sure you want to refund all paid amounts? This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={handleRefund}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#c5221f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRefundPrompt(false)}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#e2e8f0',
                            color: '#334155',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Booking Option */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.65rem',
                  marginTop: '0.5rem',
                }}
              >
                {!showCancelPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#3a3a3a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <XIcon />
                    <span>Cancel Booking</span>
                  </button>
                ) : (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Cancellation Reason:
                    </label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter reason..."
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.8rem',
                        color: '#0f172a',
                        marginBottom: '0.5rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.6rem',
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
                          padding: '0.45rem 0.6rem',
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
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

          {/* D. CANCELLED STATE (with pending refund) */}
          {status === 'cancelled' && paidEGP > 0 && (
            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              {showFinancialSummary && (
                <div style={{ fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  <div style={{ color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>Financial Summary:</div>
                  {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span>Base price:</span>
                        <span>{basePriceEGP.toLocaleString()} EGP</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.15rem',
                          color: '#137333',
                        }}
                      >
                        <span>Loyalty discount:</span>
                        <span>-{loyaltyDiscountEGP.toLocaleString()} EGP</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Net Total:</span>
                    <span>{totalAmountEGP.toLocaleString()} EGP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Paid (Retained/Pending):</span>
                    <span style={{ fontWeight: 600, color: '#137333' }}>{paidEGP.toLocaleString()} EGP</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Financial Status:</span>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        color: paymentStatus === 'refunded' ? '#c5221f' : '#b06000',
                      }}
                    >
                      {paymentStatus || 'partially_paid'}
                    </span>
                  </div>
                </div>
              )}

              {/* Refund Option */}
              {paymentStatus !== 'refunded' && (
                <div
                  style={{
                    borderTop: showFinancialSummary ? '1px solid #f1f5f9' : 'none',
                    paddingTop: showFinancialSummary ? '0.65rem' : 0,
                  }}
                >
                  {!showRefundPrompt ? (
                    <button
                      type="button"
                      onClick={() => setShowRefundPrompt(true)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#c5221f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <RotateCcwIcon />
                      <span>Issue Refund ({paidEGP.toLocaleString()} EGP)</span>
                    </button>
                  ) : (
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#c5221f',
                          marginBottom: '0.4rem',
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        Are you sure you want to refund this amount? This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={handleRefund}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#c5221f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRefundPrompt(false)}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#e2e8f0',
                            color: '#334155',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
