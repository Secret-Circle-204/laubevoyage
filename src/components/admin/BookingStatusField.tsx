'use client'

import React, { useState } from 'react'
import { useField, useFormFields, useDocumentInfo } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import {
  confirmAdminBookingAction,
  cancelAdminBookingAction,
  moveToPendingAdminReviewAction,
  recordSubsequentPaymentAction,
  refundAdminBookingAction,
} from '@/application/actions/booking-actions'

function AlertTriangleIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function RotateCcwIcon() {
  return (
    <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

export const BookingStatusField: SelectFieldClientComponent = (props) => {
  const { path } = props
  const { value, setValue } = useField<string>({ path })

  // Retrieve essential document fields from Payload Form State & Document Context
  const docInfo = useDocumentInfo()
  const bookingId = docInfo?.id ? Number(docInfo.id) : undefined
  const docData = (docInfo as any)?.initialData || (docInfo as any)?.savedDocumentData || (docInfo as any)?.data

  const pricingTotalAmountField = useFormFields(([fields]) => fields['pricingSnapshot.totalAmountEGP'])
  const pricingBasePriceField = useFormFields(([fields]) => fields['pricingSnapshot.basePriceEGP'])
  const pricingLoyaltyDiscountField = useFormFields(([fields]) => fields['pricingSnapshot.loyaltyDiscountEGP'])

  const paymentAttemptsField = useFormFields(([fields]) => fields.paymentAttempts)
  const paymentAttempts = (paymentAttemptsField?.value as any[] | undefined) || docData?.paymentAttempts

  const paymentStatusField = useFormFields(([fields]) => fields.paymentStatus)
  const paymentStatus = (paymentStatusField?.value as string | undefined) || docData?.paymentStatus

  const amountPaidField = useFormFields(([fields]) => fields.amountPaid)
  const amountPaid = (amountPaidField?.value as number | undefined) ?? docData?.amountPaid

  const outstandingBalanceField = useFormFields(([fields]) => fields.outstandingBalance)
  const outstandingBalance = (outstandingBalanceField?.value as number | undefined) ?? docData?.outstandingBalance

  // Authoritative Pricing Snapshot components
  const basePriceEGP = (pricingBasePriceField?.value as number | undefined) ?? docData?.pricingSnapshot?.basePriceEGP ?? 0
  const loyaltyDiscountEGP = (pricingLoyaltyDiscountField?.value as number | undefined) ?? docData?.pricingSnapshot?.loyaltyDiscountEGP ?? 0
  const totalAmountEGP =
    (pricingTotalAmountField?.value as number | undefined) ??
    docData?.pricingSnapshot?.totalAmountEGP ??
    (basePriceEGP > 0 ? Math.max(0, basePriceEGP - loyaltyDiscountEGP) : 0)

  // Component UI States
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [depositInstrument, setDepositInstrument] = useState<string>('manual')
  const [cancelReason, setCancelReason] = useState<string>('')
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)

  // Subsequent Payment States
  const [subsequentAmount, setSubsequentAmount] = useState<string>('')
  const [subsequentInstrument, setSubsequentInstrument] = useState<string>('manual')

  // Refund States
  const [showRefundPrompt, setShowRefundPrompt] = useState(false)

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
  const paidEGP = amountPaid !== undefined ? amountPaid : (paymentAttempts || [])
    .filter((a: any) => a.status === 'successful')
    .reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
  const outstandingBalanceEGP = outstandingBalance !== undefined ? outstandingBalance : Math.max(0, totalAmountEGP - paidEGP)

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
    const depositToPay = depositAmount !== '' ? Number(depositAmount) : 0
    if (depositToPay < 0 || depositToPay > outstandingBalanceEGP) {
      setErrorMsg(`Deposit must be between 0 and ${outstandingBalanceEGP} EGP.`)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await confirmAdminBookingAction({
        bookingId,
        depositAmount: depositToPay,
        currency: docData?.pricingSnapshot?.displayCurrency || 'EGP',
        instrument: depositInstrument,
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

  const handleRecordSubsequentPayment = async () => {
    const amountToPay = subsequentAmount !== '' ? Number(subsequentAmount) : outstandingBalanceEGP
    if (amountToPay <= 0 || amountToPay > outstandingBalanceEGP) {
      setErrorMsg(`Payment amount must be between 1 and ${outstandingBalanceEGP} EGP.`)
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
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Failed to record payment.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }



  const handleRefund = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await refundAdminBookingAction({
        bookingId,
      })
      if (res.success) {
        window.location.reload()
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AlertTriangleIcon />
            <span>{errorMsg}</span>
          </div>
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
              <SendIcon />
              <span>Submit for Admin Review</span>
            </button>
          )}

          {value === 'pending_admin_review' && (
            <div style={{ border: '1px solid var(--theme-elevation-150)', padding: '0.85rem', borderRadius: '6px', backgroundColor: 'var(--theme-elevation-50)' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--theme-elevation-500)', marginBottom: '0.2rem' }}>Financial Summary:</div>
                {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span>Base price:</span>
                      <span>{basePriceEGP.toLocaleString()} EGP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', color: '#137333' }}>
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

              {outstandingBalanceEGP > 0 && (
                <div style={{ marginBottom: '0.75rem', borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-elevation-600)', marginBottom: '0.25rem' }}>
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
                  <CheckIcon />
                  <span>Approve & Confirm Reservation</span>
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
                  <XIcon />
                  <span>Cancel Booking</span>
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

          {value === 'confirmed' && (
            <div style={{ border: '1px solid var(--theme-elevation-150)', padding: '0.85rem', borderRadius: '6px', backgroundColor: 'var(--theme-elevation-50)' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--theme-elevation-500)', marginBottom: '0.2rem' }}>Financial Summary:</div>
                {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span>Base price:</span>
                      <span>{basePriceEGP.toLocaleString()} EGP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', color: '#137333' }}>
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
                  <span style={{ fontWeight: 600, color: '#b06000' }}>{outstandingBalanceEGP.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Financial Status:</span>
                  <span style={{ textTransform: 'uppercase', color: paymentStatus === 'paid' ? '#137333' : '#b06000' }}>
                    {paymentStatus || 'unpaid'}
                  </span>
                </div>
              </div>

              {/* Subsequent Payment Option */}
              {outstandingBalanceEGP > 0 && (
                <div style={{ borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--theme-elevation-800)' }}>
                    Record Subsequent Payment
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-elevation-600)', marginBottom: '0.25rem' }}>
                      Amount (EGP, defaults to full outstanding):
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
                        padding: '0.4rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--theme-elevation-250)',
                        backgroundColor: 'var(--theme-elevation-0)',
                        fontSize: '0.8rem',
                        color: 'var(--theme-elevation-800)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRecordSubsequentPayment}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <CreditCardIcon />
                    <span>Record Payment</span>
                  </button>
                </div>
              )}



              {/* Refund Option */}
              {paidEGP > 0 && (
                <div style={{ borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {!showRefundPrompt ? (
                    <button
                      type="button"
                      onClick={() => setShowRefundPrompt(true)}
                      style={{
                        width: '100%',
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
                    <RotateCcwIcon />
                    <span>Issue Manual Refund ({paidEGP.toLocaleString()} EGP)</span>
                  </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#c5221f', marginBottom: '0.4rem', fontWeight: 500 }}>
                        Are you sure you want to refund all paid amounts? This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={handleRefund}
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
                          Confirm Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRefundPrompt(false)}
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
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Booking Option */}
              <div style={{ borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                {!showCancelPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      backgroundColor: '#3a3a3a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <XIcon />
                    <span>Cancel Booking</span>
                  </button>
                ) : (
                  <div>
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

          {value === 'cancelled' && paidEGP > 0 && (
            <div style={{ border: '1px solid var(--theme-elevation-150)', padding: '0.85rem', borderRadius: '6px', backgroundColor: 'var(--theme-elevation-50)' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--theme-elevation-500)', marginBottom: '0.2rem' }}>Financial Summary:</div>
                {basePriceEGP > 0 && loyaltyDiscountEGP > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span>Base price:</span>
                      <span>{basePriceEGP.toLocaleString()} EGP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', color: '#137333' }}>
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
                  <span style={{ textTransform: 'uppercase', color: paymentStatus === 'refunded' ? '#c5221f' : '#b06000' }}>
                    {paymentStatus || 'partially_paid'}
                  </span>
                </div>
              </div>

              {/* Refund Option */}
              {paymentStatus !== 'refunded' && (
                <div style={{ borderTop: '1px solid var(--theme-elevation-200)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {!showRefundPrompt ? (
                    <button
                      type="button"
                      onClick={() => setShowRefundPrompt(true)}
                      style={{
                        width: '100%',
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
                    <RotateCcwIcon />
                    <span>Issue Refund ({paidEGP.toLocaleString()} EGP)</span>
                  </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#c5221f', marginBottom: '0.4rem', fontWeight: 500 }}>
                        Are you sure you want to refund this amount? This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={handleRefund}
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
                          Confirm Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRefundPrompt(false)}
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

