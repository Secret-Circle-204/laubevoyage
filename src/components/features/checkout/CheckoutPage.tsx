'use client'

import React, { useState, useEffect } from 'react'
import { Card, Badge, Input, Button, CurrencyDisplay } from '@/components/ui'
import { useToast } from '@/providers'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import type { ConvertedPrice } from '@/domains/currency/types'

interface PricingPreviewState {
  unitPrice: ConvertedPrice
  totalPrice: ConvertedPrice
  originalPrice?: ConvertedPrice
  loyaltyDiscountPrice?: ConvertedPrice
  estimatedEarnPoints?: number
  remainingLoyaltyPoints?: number
}

export function CheckoutPage({ data }: { data: CheckoutPageDTO }) {
  const { addToast } = useToast()
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [keyRotationCounter, setKeyRotationCounter] = useState<number>(0)
  const [applyPoints, setApplyPoints] = useState<boolean>(false)
  const [pointsToRedeem, setPointsToRedeem] = useState<number | string>('')

  // Live Repricing Preview State (Authoritative Server Query)
  const [previewPricing, setPreviewPricing] = useState<PricingPreviewState | null>(() => ({
    unitPrice: data.subtotalPrice,
    totalPrice: data.totalCost,
    originalPrice: data.subtotalPrice,
    loyaltyDiscountPrice: data.loyaltyDiscountPrice,
    estimatedEarnPoints: data.estimatedEarnPoints,
    remainingLoyaltyPoints: data.availableLoyaltyPoints,
  }))
  const [isRepricing, setIsRepricing] = useState<boolean>(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Pure validation derived during render (avoids setState in effect body)
  const currentPointsNum =
    applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
      ? pointsToRedeem
      : applyPoints && pointsToRedeem !== '' && !isNaN(Number(pointsToRedeem))
        ? Number(pointsToRedeem)
        : 0

  const isInputInvalid =
    applyPoints &&
    pointsToRedeem !== '' &&
    (!Number.isInteger(Number(pointsToRedeem)) || Number(pointsToRedeem) < 0)

  const inputValidationError = isInputInvalid ? 'Points must be a valid non-negative integer.' : null
  const effectivePricingError = inputValidationError || pricingError

  // Traveler Details Form State for all passengers
  const [travelers, setTravelers] = useState<Array<{
    firstName: string
    lastName: string
    email: string
    phone: string
    type: 'adult' | 'child'
  }>>(() => {
    const initial = []
    // Traveler 1 (Lead traveler)
    initial.push({
      firstName: data.leadTraveler?.firstName || '',
      lastName: data.leadTraveler?.lastName || '',
      email: data.leadTraveler?.email || '',
      phone: data.leadTraveler?.phone || '',
      type: 'adult' as const,
    })

    // Companion Adults
    for (let i = 1; i < data.adultsCount; i++) {
      initial.push({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: 'adult' as const,
      })
    }

    // Companion Children
    for (let i = 0; i < data.childrenCount; i++) {
      initial.push({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: 'child' as const,
      })
    }

    return initial
  })

  const updateTravelerField = (index: number, field: 'firstName' | 'lastName' | 'email' | 'phone', value: string) => {
    setTravelers((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const [idempotencyKey, setIdempotencyKey] = React.useState<string>('')

  React.useEffect(() => {
    const storageKey = `laube_chk_key_${data.experienceId}_${data.slotId || 'noslot'}_${data.departureDate}`
    let key = sessionStorage.getItem(storageKey)
    if (!key) {
      const attemptUUID = Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
      key = `checkout:${data.experienceId}:${data.slotId || 'noslot'}:${data.departureDate}:${attemptUUID}`
      sessionStorage.setItem(storageKey, key)
    }
    
    const timer = setTimeout(() => {
      setIdempotencyKey(key)
    }, 0)
    return () => clearTimeout(timer)
  }, [data.experienceId, data.slotId, data.departureDate, keyRotationCounter])

  // Live Repricing Hook on points change or toggle
  useEffect(() => {
    let isCancelled = false
    const pointsNum =
      applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
        ? pointsToRedeem
        : applyPoints && pointsToRedeem !== '' && !isNaN(Number(pointsToRedeem))
          ? Number(pointsToRedeem)
          : 0

    // Skip async query if input format is invalid
    if (applyPoints && pointsToRedeem !== '' && (!Number.isInteger(pointsNum) || pointsNum < 0)) {
      return
    }

    const timer = setTimeout(async () => {
      setIsRepricing(true)
      setPricingError(null)
      try {
        const res = await resolvePricingAction({
          experienceId: data.experienceId,
          slotId: data.slotId,
          date: data.departureDate,
          startTime: data.startTime,
          adults: data.adultsCount,
          children: data.childrenCount,
          currency: data.totalCost.currencyCode,
          pointsToRedeem: pointsNum > 0 ? pointsNum : undefined,
        })

        if (!isCancelled) {
          if (res.success && res.pricing) {
            setPreviewPricing(res.pricing)
            setPricingError(null)
          } else {
            setPricingError(res.error || 'Failed to update pricing')
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setPricingError(err instanceof Error ? err.message : 'Pricing resolution failed')
        }
      } finally {
        if (!isCancelled) {
          setIsRepricing(false)
        }
      }
    }, 150)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [
    applyPoints,
    pointsToRedeem,
    data.experienceId,
    data.slotId,
    data.departureDate,
    data.startTime,
    data.adultsCount,
    data.childrenCount,
    data.totalCost.currencyCode,
  ])

  const handleConfirmPayment = async () => {
    // Validate that all travelers have firstName, lastName, email, and phone filled in
    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i]
      const label = i === 0 ? 'Lead Traveler' : `Traveler #${i + 1} (${t.type === 'adult' ? 'Adult' : 'Child'})`
      if (!t.firstName || !t.lastName || !t.email || !t.phone) {
        addToast({
          type: 'error',
          title: 'Missing Information',
          description: `Please fill in all details for ${label}.`,
        })
        return
      }
    }

    if (effectivePricingError) {
      addToast({
        type: 'error',
        title: 'Invalid Points Selection',
        description: effectivePricingError,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await confirmCheckoutAction({
        bookingId: data.bookingId,
        experienceId: data.experienceId,
        slotId: data.slotId,
        date: data.departureDate,
        startTime: data.startTime,
        adults: data.adultsCount,
        travelers: travelers,
        gatewayId: selectedGateway,
        idempotencyKey,
        pointsToRedeem:
          applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
            ? pointsToRedeem
            : applyPoints && pointsToRedeem !== ''
              ? Number(pointsToRedeem)
              : undefined,
      })

      if (res.success && 'transactionId' in res) {
        const txId = typeof res.transactionId === 'string' ? res.transactionId : 'payment'
        const checkoutUrl = 'checkoutUrl' in res && typeof res.checkoutUrl === 'string' ? res.checkoutUrl : undefined
        const bookingNumber = 'bookingNumber' in res && typeof res.bookingNumber === 'string' ? res.bookingNumber : undefined

        if (bookingNumber && typeof window !== 'undefined') {
          const newPath = `/checkout/${bookingNumber}?experienceId=${data.experienceId}`
          window.history.replaceState({}, '', newPath)
        }

        addToast({
          type: 'success',
          title: 'Payment Processed!',
          description: `Transaction #${txId} initiated successfully.`,
        })
        if (checkoutUrl) {
          window.location.href = checkoutUrl
        }
      } else {
        const errorMsg = 'error' in res && typeof res.error === 'string' ? res.error : 'Payment gateway failed'
        addToast({ type: 'error', title: 'Payment Failed', description: errorMsg })
        if ('code' in res && (res.code === 'BOOKING_EXPIRED' || res.code === 'BOOKING_CANCELLED' || res.code === 'IDEMPOTENCY_CONFLICT')) {
          const storageKey = `laube_chk_key_${data.experienceId}_${data.slotId || 'noslot'}_${data.departureDate}`
          sessionStorage.removeItem(storageKey)
          setKeyRotationCounter((prev) => prev + 1)
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed'
      addToast({ type: 'error', title: 'Error', description: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="accent" className="mb-3">
            Secure Checkout Engine
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Complete Your Booking
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-base">
            Booking Reference: <span className="font-mono font-bold text-[#00aeef]">{data.bookingId}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Checkout Form Column */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            {/* Step 1: Traveler Information */}
            <div className="flex flex-col gap-6">
              {travelers.map((traveler, idx) => (
                <Card key={idx} variant="flat" padding="lg">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm flex items-center justify-center">
                      {idx === 0 ? 1 : `1.${idx}`}
                    </span>
                    {idx === 0 ? 'Lead Traveler Details' : `Companion Traveler #${idx + 1} (${traveler.type === 'adult' ? 'Adult' : 'Child'}) *`}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name *"
                      value={traveler.firstName}
                      onChange={(e) => updateTravelerField(idx, 'firstName', e.target.value)}
                      placeholder="e.g. Alexander"
                    />
                    <Input
                      label="Last Name *"
                      value={traveler.lastName}
                      onChange={(e) => updateTravelerField(idx, 'lastName', e.target.value)}
                      placeholder="e.g. Vance"
                    />
                    <Input
                      label="Email Address *"
                      type="email"
                      value={traveler.email}
                      onChange={(e) => updateTravelerField(idx, 'email', e.target.value)}
                      placeholder="alexander@example.com"
                    />
                    <Input
                      label="Phone / WhatsApp *"
                      value={traveler.phone}
                      onChange={(e) => updateTravelerField(idx, 'phone', e.target.value)}
                      placeholder="+20 100 123 4567"
                    />
                  </div>
                </Card>
              ))}
            </div>

            {/* Loyalty Points Redemption Section */}
            {data.availableLoyaltyPoints > 0 && (
              <Card variant="flat" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 text-sm flex items-center justify-center font-bold">★</span>
                    Loyalty Rewards
                  </h2>
                  <Badge variant="secondary" size="sm">
                    {data.availableLoyaltyPoints.toLocaleString()} Points Available
                  </Badge>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyPoints}
                      onChange={(e) => {
                        setApplyPoints(e.target.checked)
                        if (e.target.checked && pointsToRedeem === '') {
                          setPointsToRedeem(data.minRedemptionPoints)
                        }
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Redeem loyalty points for a discount on this booking
                    </span>
                  </label>

                  {applyPoints && (
                    <div className="pt-2 pl-8 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={data.minRedemptionPoints}
                          max={data.availableLoyaltyPoints}
                          step={data.redemptionStepUnit}
                          value={pointsToRedeem}
                          onChange={(e) => {
                            const raw = e.target.value
                            setPointsToRedeem(raw === '' ? '' : Number(raw))
                          }}
                          className="w-36 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                        />
                        <span className="text-xs text-slate-500">
                          (Multiples of {data.redemptionStepUnit} points)
                        </span>
                      </div>

                      {/* 3-Badge Transactional Loyalty Breakdown */}
                      <div className="mt-2 pt-3 border-t border-amber-100 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Points to redeem</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {currentPointsNum.toLocaleString()} pts
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Discount value</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {previewPricing?.loyaltyDiscountPrice
                              ? previewPricing.loyaltyDiscountPrice.formatted
                              : isRepricing
                                ? 'Calculating...'
                                : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Remaining balance</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {previewPricing?.remainingLoyaltyPoints !== undefined
                              ? `${previewPricing.remainingLoyaltyPoints.toLocaleString()} pts`
                              : `${Math.max(0, data.availableLoyaltyPoints - currentPointsNum).toLocaleString()} pts`}
                          </span>
                        </div>
                      </div>

                      {/* Projected / Estimated Rewards Banner */}
                      {previewPricing?.estimatedEarnPoints !== undefined && (
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span>🎁 Estimated rewards from this booking:</span>
                          <span className="font-bold text-[#00aeef]">
                            +{previewPricing.estimatedEarnPoints.toLocaleString()} pts*
                          </span>
                        </div>
                      )}

                      {effectivePricingError && (
                        <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
                          ⚠️ {effectivePricingError}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 italic">
                        * Points discount and estimated rewards are calculated on the server and applied securely upon booking confirmation.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Step 2: Payment Gateway Selection */}
            <Card variant="flat" padding="lg">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm flex items-center justify-center">2</span>
                Payment Method
              </h2>

              <div className="flex flex-col gap-3">
                {data.gateways.map((gw) => (
                  <button
                    key={gw.id}
                    onClick={() => setSelectedGateway(gw.id)}
                    className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedGateway === gw.id
                        ? 'border-[#00aeef] bg-[#00aeef]/10 ring-2 ring-[#00aeef]/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 font-semibold text-sm">
                      <span className="text-xl">{gw.icon}</span>
                      <span>{gw.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">SSL Encrypted</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card variant="elevated" padding="lg" className="flex flex-col gap-6">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
                Booking Summary
              </h3>

              <div className="flex gap-4 items-center">
                <div
                  className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${data.imageUrl})` }}
                />
                <div>
                  <Badge variant="primary" size="sm" className="mb-1">
                    {data.experienceType === 'package' ? 'Tour Package' : 'Daily Tour'}
                  </Badge>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {data.experienceTitle}
                  </h4>
                  <span className="text-xs text-slate-500 block mt-1">📅 {data.departureDate}</span>
                </div>
              </div>

              {/* Cost Breakdown List */}
              <div className="flex flex-col gap-2.5 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Passengers ({data.adultsCount} Adults{data.childrenCount > 0 ? `, ${data.childrenCount} Children` : ''})</span>
                  <CurrencyDisplay
                    price={previewPricing?.originalPrice || previewPricing?.unitPrice || data.subtotalPrice}
                    size="sm"
                  />
                </div>

                {applyPoints && previewPricing?.loyaltyDiscountPrice && previewPricing.loyaltyDiscountPrice.convertedAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Loyalty Points Discount</span>
                    <span>-{previewPricing.loyaltyDiscountPrice.formatted}</span>
                  </div>
                )}

                <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="flex items-center gap-2">
                    Total Amount
                    {isRepricing && <span className="text-xs font-normal text-slate-400 animate-pulse">(Updating...)</span>}
                  </span>
                  <CurrencyDisplay price={previewPricing?.totalPrice || data.totalCost} size="lg" />
                </div>
              </div>

              <Button
                variant="accent"
                size="lg"
                className="w-full font-bold shadow-xl mt-2"
                isLoading={isSubmitting}
                onClick={handleConfirmPayment}
              >
                Pay & Confirm Reservation →
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
