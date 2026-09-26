'use client'

import React, { useState, useCallback } from 'react'
import { useField, useFormFields, useDocumentInfo, useForm } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { BookingOperationalActions } from './booking/BookingOperationalActions'

export const BookingStatusField: SelectFieldClientComponent = (props) => {
  const { path } = props
  const { value, setValue } = useField<string>({ path })
  const form = useForm()
  const dispatchFields = form?.dispatchFields

  // Retrieve essential document fields from Payload Form State & Document Context
  const docInfo = useDocumentInfo()
  const bookingId = docInfo?.id ? Number(docInfo.id) : undefined
  const docData = (docInfo as any)?.initialData || (docInfo as any)?.savedDocumentData || (docInfo as any)?.data

  // Local authoritative document override state populated upon successful operational action
  const [overrideDoc, setOverrideDoc] = useState<any>(null)

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

  // Calculate dynamic outstanding balance
  const fallbackPaid = amountPaid !== undefined ? amountPaid : (paymentAttempts || [])
    .filter((a: any) => a.status === 'successful')
    .reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
  const fallbackOutstanding = outstandingBalance !== undefined ? outstandingBalance : Math.max(0, totalAmountEGP - fallbackPaid)

  // Compute effective authoritative values, preferring overrideDoc when available
  const effectiveStatus = overrideDoc?.status || value || 'draft'
  const effectiveBasePrice = overrideDoc?.pricingSnapshot?.basePriceEGP ?? basePriceEGP
  const effectiveLoyaltyDiscount = overrideDoc?.pricingSnapshot?.loyaltyDiscountEGP ?? loyaltyDiscountEGP
  const effectiveTotalAmount = overrideDoc?.pricingSnapshot?.totalAmountEGP ?? totalAmountEGP
  const effectivePaid = overrideDoc?.amountPaid ?? fallbackPaid
  const effectiveOutstanding = overrideDoc?.outstandingBalance ?? fallbackOutstanding
  const effectivePaymentStatus = overrideDoc?.paymentStatus || paymentStatus
  const effectiveCurrency = overrideDoc?.pricingSnapshot?.displayCurrency || docData?.pricingSnapshot?.displayCurrency || 'EGP'

  const handleActionSuccess = useCallback(async () => {
    if (!bookingId) return
    try {
      const res = await fetch(`/api/bookings/${bookingId}?depth=1`)
      if (res.ok) {
        const freshDoc = await res.json()
        if (freshDoc && freshDoc.id) {
          // 1. Immediately update host component's state to reflect authoritative record
          setOverrideDoc(freshDoc)

          // 2. Synchronize Payload DocumentInfo context if available
          if (typeof (docInfo as any)?.setData === 'function') {
            ;(docInfo as any).setData(freshDoc)
          }

          // 3. Update field value for status
          if (typeof setValue === 'function' && freshDoc.status) {
            setValue(freshDoc.status)
          }

          // 4. Synchronize Payload form fields via dispatchFields with both value and initialValue
          // to ensure form consistency and prevent accidental overwrite on subsequent native save.
          if (typeof dispatchFields === 'function') {
            const syncField = (fieldPath: string, val: any) => {
              if (val !== undefined) {
                dispatchFields({
                  type: 'UPDATE',
                  path: fieldPath,
                  value: val,
                  initialValue: val,
                })
              }
            }

            syncField('status', freshDoc.status)
            syncField('amountPaid', freshDoc.amountPaid)
            syncField('outstandingBalance', freshDoc.outstandingBalance)
            syncField('paymentStatus', freshDoc.paymentStatus)
            syncField('paymentAttempts', freshDoc.paymentAttempts)
            syncField('timeline', freshDoc.timeline)
            syncField('auditTrail', freshDoc.auditTrail)
            syncField('capacityHold', freshDoc.capacityHold)
            syncField('pointHold', freshDoc.pointHold)

            if (freshDoc.pricingSnapshot) {
              syncField('pricingSnapshot.basePriceEGP', freshDoc.pricingSnapshot.basePriceEGP)
              syncField('pricingSnapshot.loyaltyDiscountEGP', freshDoc.pricingSnapshot.loyaltyDiscountEGP)
              syncField('pricingSnapshot.totalAmountEGP', freshDoc.pricingSnapshot.totalAmountEGP)
            }
          }
        }
      }
    } catch (err) {
      console.error('[BookingStatusField] Failed to re-read authoritative document:', err)
    }
  }, [bookingId, docInfo, setValue, dispatchFields])

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

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <BookingOperationalActions
        bookingId={bookingId}
        status={effectiveStatus}
        pricing={{
          basePriceEGP: effectiveBasePrice,
          loyaltyDiscountEGP: effectiveLoyaltyDiscount,
          totalAmountEGP: effectiveTotalAmount,
          paidEGP: effectivePaid,
          outstandingBalanceEGP: effectiveOutstanding,
          displayCurrency: effectiveCurrency,
          paymentStatus: effectivePaymentStatus,
        }}
        showStatusBadge={true}
        showFinancialSummary={true}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  )
}

