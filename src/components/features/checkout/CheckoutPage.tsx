'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, Badge, Input, Button, CurrencyDisplay } from '@/components/ui'
import { useToast, useLocale } from '@/providers'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import type { ConvertedPrice } from '@/domains/currency/types'
import { JsonTranslationDictionary } from '@/domains/translation/dictionary'
import {
  ManifestDiagnosticsPresenter,
  type ManifestPresentationDiagnostics,
} from '@/application/booking/manifest-diagnostics'
import {
  CheckoutPickupLocationPicker,
  type PickupLocationValue,
} from './CheckoutPickupLocationPicker'


const dict = new JsonTranslationDictionary()

interface PricingPreviewState {
  unitPrice: ConvertedPrice
  totalPrice: ConvertedPrice
  originalPrice?: ConvertedPrice
  loyaltyDiscountPrice?: ConvertedPrice
  estimatedEarnPoints?: number
  remainingLoyaltyPoints?: number
}

interface TravelerFormState {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  passportNumber?: string
  nationality?: string
  type: 'adult' | 'child' | 'infant'
  declaredAge?: number
  beddingMode?: 'sharing_bed' | 'extra_bed'
}

export function CheckoutPage({ data }: { data: CheckoutPageDTO }) {
  const { addToast } = useToast()
  const { locale } = useLocale()
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [keyRotationCounter, setKeyRotationCounter] = useState<number>(0)
  const [applyPoints, setApplyPoints] = useState<boolean>(false)
  const [pointsToRedeem, setPointsToRedeem] = useState<number | string>('')
  const [activeTravelerIndex, setActiveTravelerIndex] = useState<number>(0)
  const [showIncompleteCallout, setShowIncompleteCallout] = useState<boolean>(false)
  const [pickupLocation, setPickupLocation] = useState<PickupLocationValue | null>(null)

  const [touchedMap, setTouchedMap] = useState<Record<number, boolean>>(() => ({ 0: true }))

  const activeEditorRef = useRef<HTMLDivElement>(null)
  const calloutBannerRef = useRef<HTMLDivElement>(null)
  const firstNameInputRef = useRef<HTMLInputElement>(null)
  const lastNameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const dobInputRef = useRef<HTMLInputElement>(null)

  const paymentMethodTitle = dict.get(locale, 'checkout.paymentMethod')
  const applyLoyaltyTitle = dict.get(locale, 'checkout.applyLoyaltyPoints')
  const orderSummaryTitle = dict.get(locale, 'checkout.orderSummary')
  const confirmAndPayButton = dict.get(locale, 'checkout.confirmAndPay')
  const packageLabel = dict.get(locale, 'catalog.packageLabel')
  const dailyTourLabel = dict.get(locale, 'catalog.dailyTourLabel')

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
  const latestPricingRequestIdRef = useRef<number>(0)

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

  const [travelers, setTravelers] = useState<TravelerFormState[]>(() => {
    const list: TravelerFormState[] = []

    list.push({
      firstName: data.leadTraveler?.firstName || '',
      lastName: data.leadTraveler?.lastName || '',
      email: data.leadTraveler?.email || '',
      phone: data.leadTraveler?.phone || '',
      dateOfBirth: '',
      passportNumber: '',
      nationality: '',
      type: 'adult',
    })

    for (let i = 1; i < data.adultsCount; i++) {
      list.push({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        nationality: '',
        type: 'adult',
      })
    }

    for (let i = 0; i < data.childrenCount; i++) {
      const age = data.childAges?.[i] ?? 6
      const bedding = data.childBeddingModes?.[i] ?? 'sharing_bed'
      list.push({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        nationality: '',
        type: age < 2 ? 'infant' : 'child',
        declaredAge: age,
        beddingMode: bedding,
      })
    }

    return list
  })

  const diagnostics: ManifestPresentationDiagnostics = useMemo(() => {
    return ManifestDiagnosticsPresenter.evaluate(
      travelers,
      data.adultsCount,
      data.childrenCount,
      touchedMap,
    )
  }, [travelers, data.adultsCount, data.childrenCount, touchedMap])

  const updateTravelerField = (
    index: number,
    field: keyof TravelerFormState,
    value: string,
  ) => {
    setTravelers((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
    setTouchedMap((prev) => (prev[index] ? prev : { ...prev, [index]: true }))
  }

  const navigateToTraveler = (
    index: number,
    fieldToFocus?: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth',
  ) => {
    setActiveTravelerIndex(index)
    setTouchedMap((prev) => ({ ...prev, [index]: true }))

    setTimeout(() => {
      activeEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const target =
        fieldToFocus || diagnostics.travelers[index]?.primaryMissingField || 'firstName'
      if (target === 'firstName') firstNameInputRef.current?.focus()
      else if (target === 'lastName') lastNameInputRef.current?.focus()
      else if (target === 'email') emailInputRef.current?.focus()
      else if (target === 'phone') phoneInputRef.current?.focus()
      else if (target === 'dateOfBirth') dobInputRef.current?.focus()
    }, 100)
  }

  const handleSaveAndNext = (currentIndex: number) => {
    const currentPres = diagnostics.travelers[currentIndex]
    if (currentPres && currentPres.hasIssues) {
      setTouchedMap((prev) => ({ ...prev, [currentIndex]: true }))
      const missingField = currentPres.primaryMissingField
      setTimeout(() => {
        if (missingField === 'firstName') firstNameInputRef.current?.focus()
        else if (missingField === 'lastName') lastNameInputRef.current?.focus()
        else if (missingField === 'email') emailInputRef.current?.focus()
        else if (missingField === 'phone') phoneInputRef.current?.focus()
        else if (missingField === 'dateOfBirth') dobInputRef.current?.focus()
      }, 50)
      return
    }

    const nextIndex = ManifestDiagnosticsPresenter.findNextIncompleteIndex(
      currentIndex,
      diagnostics,
    )
    if (nextIndex !== -1 && nextIndex !== currentIndex) {
      const targetTraveler = diagnostics.travelers[nextIndex]
      navigateToTraveler(nextIndex, targetTraveler?.primaryMissingField)
    } else if (diagnostics.incompleteTravelers.length === 0) {
      setShowIncompleteCallout(false)
      addToast({
        type: 'success',
        title: 'All Travelers Completed!',
        description: 'Passenger manifest is complete and ready for booking confirmation.',
      })
    }
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

  // Live Repricing Hook on points change or toggle with race condition protection
  useEffect(() => {
    let isCancelled = false
    const requestId = ++latestPricingRequestIdRef.current

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
          childAges: data.childAges,
          childBeddingModes: data.childBeddingModes,
          requestedRooms: data.requestedRooms,
          currency: data.totalCost.currencyCode,
          locale,
          pointsToRedeem: pointsNum > 0 ? pointsNum : undefined,
        })

        if (!isCancelled && requestId === latestPricingRequestIdRef.current) {
          if (res.success && res.pricing) {
            setPreviewPricing(res.pricing)
            setPricingError(null)
          } else {
            setPricingError(res.error || 'Failed to update pricing')
          }
        }
      } catch (err: unknown) {
        if (!isCancelled && requestId === latestPricingRequestIdRef.current) {
          setPricingError(err instanceof Error ? err.message : 'Pricing resolution failed')
        }
      } finally {
        if (!isCancelled && requestId === latestPricingRequestIdRef.current) {
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
    data.childAges,
    data.childBeddingModes,
    data.requestedRooms,
    data.totalCost.currencyCode,
    locale,
  ])

  const handleConfirmPayment = async () => {
    if (!diagnostics.valid) {
      const newTouched: Record<number, boolean> = { ...touchedMap }
      diagnostics.incompleteTravelers.forEach((t) => {
        newTouched[t.index] = true
      })
      setTouchedMap(newTouched)
      setShowIncompleteCallout(true)

      calloutBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (diagnostics.firstIncompleteIndex !== -1) {
        navigateToTraveler(
          diagnostics.firstIncompleteIndex,
          diagnostics.travelers[diagnostics.firstIncompleteIndex]?.primaryMissingField,
        )
      }

      addToast({
        type: 'error',
        title: 'Incomplete Traveler Information',
        description: `Almost there — ${diagnostics.incompleteTravelers.length} traveler profile(s) need information before confirming.`,
      })
      return
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
        childrenCount: data.childrenCount,
        childAges: data.childAges,
        childBeddingModes: data.childBeddingModes,
        requestedRooms: data.requestedRooms,
        travelers: travelers as any,
        pickupLocation: pickupLocation
          ? {
              label: pickupLocation.label,
              address: pickupLocation.address,
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
              source: pickupLocation.source,
              instructions: pickupLocation.instructions,
            }
          : undefined,
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
        const checkoutUrl =
          'checkoutUrl' in res && typeof res.checkoutUrl === 'string' ? res.checkoutUrl : undefined
        const bookingNumber =
          'bookingNumber' in res && typeof res.bookingNumber === 'string'
            ? res.bookingNumber
            : undefined

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
        const errorMsg =
          'error' in res && typeof res.error === 'string' ? res.error : 'Booking confirmation failed'
        const failureTitle =
          'failureStage' in res && (res as any).failureStage === 'payment'
            ? 'Payment Failed'
            : 'Booking Confirmation Failed'
        addToast({ type: 'error', title: failureTitle, description: errorMsg })
        if (
          'code' in res &&
          (res.code === 'BOOKING_EXPIRED' ||
            res.code === 'BOOKING_CANCELLED' ||
            res.code === 'IDEMPOTENCY_CONFLICT')
        ) {
          const storageKey = `laube_chk_key_${data.experienceId}_${data.slotId || 'noslot'}_${data.departureDate}`
          sessionStorage.removeItem(storageKey)
          setKeyRotationCounter((prev) => prev + 1)
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Booking confirmation failed'
      addToast({ type: 'error', title: 'Booking Confirmation Failed', description: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeTraveler = travelers[activeTravelerIndex]
  const activePres = diagnostics.travelers[activeTravelerIndex]
  const isLeadActive = activeTravelerIndex === 0

  const activeFieldErrors = useMemo(() => {
    const map: Record<string, string> = {}
    if (activePres && touchedMap[activeTravelerIndex]) {
      activePres.issues.forEach((iss) => {
        map[iss.field] = iss.message
      })
    }
    return map
  }, [activePres, touchedMap, activeTravelerIndex])

  return (
    <div className="py-12 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="accent" className="mb-2.5">
            Group Travel Booking Assistant
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Complete Your Journey Reservation
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
            Booking Manifest Reference:{' '}
            <span className="font-mono font-bold text-[#00aeef]">{data.bookingId}</span>
          </p>
        </div>

        {showIncompleteCallout && diagnostics.incompleteTravelers.length > 0 && (
          <div
            ref={calloutBannerRef}
            className="mb-8 p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <span>⚠</span> {diagnostics.bannerTitle}
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {diagnostics.bannerSubtitle}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigateToTraveler(
                    diagnostics.firstIncompleteIndex,
                    diagnostics.travelers[diagnostics.firstIncompleteIndex]?.primaryMissingField,
                  )
                }
                className="font-bold shadow-md flex-shrink-0"
              >
                {diagnostics.primaryActionLabel}
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {diagnostics.incompleteTravelers.map((t) => (
                <div
                  key={t.index}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {t.index === 0 ? 'Lead Traveler' : `Traveler ${t.travelerNumber}`}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                      ⚠ {t.missingFieldsSummary.replace('Missing: ', '')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToTraveler(t.index, t.primaryMissingField)}
                    className="font-bold text-[#00aeef] hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    <span>Fix</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card
              variant="flat"
              padding="lg"
              className="border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm font-bold flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Lead Traveler & Booking Contact
                    </h2>
                    <span className="text-xs text-slate-400">
                      Primary contact for tickets, confirmations, and itinerary updates
                    </span>
                  </div>
                </div>
                <Badge variant="success" size="sm" className="hidden sm:inline-flex">
                  ✓ Account Verified
                </Badge>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Official Booking Contact Details
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {travelers[0]?.email || 'No email provided'} •{' '}
                      {travelers[0]?.phone || 'No phone provided'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {travelers[0]?.phone
                        ? 'Pre-filled from your verified account. Notifications will be sent here.'
                        : 'Contact phone is required for urgent journey alerts. Edit below in Lead Traveler.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToTraveler(0, travelers[0]?.phone ? 'email' : 'phone')}
                    className="text-xs font-bold text-[#00aeef] hover:underline flex-shrink-0 ml-2"
                  >
                    Edit Contact →
                  </button>
                </div>
              </div>
            </Card>

            <Card
              variant="flat"
              padding="lg"
              className="border border-slate-200/80 dark:border-slate-800"
            >
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Travelers Manifest
                      </h2>
                      <span className="text-xs text-slate-500">
                        {data.adultsCount} Adults
                        {data.childrenCount > 0 ? ` • ${data.childrenCount} Children` : ''} (
                        {diagnostics.totalProvided} Total Guests)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {diagnostics.completedCount} of {diagnostics.totalProvided} completed
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {diagnostics.progressPercent}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2e3192] to-[#00aeef] transition-all duration-300 ease-out"
                    style={{ width: `${diagnostics.progressPercent}%` }}
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓</span>
                      <span>{diagnostics.completedCount} completed</span>
                    </span>
                    {diagnostics.needsAttentionCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <span>⚠</span>
                        <span>{diagnostics.needsAttentionCount} need information</span>
                      </span>
                    )}
                    {diagnostics.notStartedCount > 0 && (
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <span>○</span>
                        <span>{diagnostics.notStartedCount} remaining</span>
                      </span>
                    )}
                  </div>

                  {diagnostics.firstIncompleteIndex !== -1 && (
                    <button
                      type="button"
                      onClick={() =>
                        navigateToTraveler(
                          diagnostics.firstIncompleteIndex,
                          diagnostics.travelers[diagnostics.firstIncompleteIndex]
                            ?.primaryMissingField,
                        )
                      }
                      className="font-bold text-[#00aeef] hover:underline flex items-center gap-1"
                    >
                      <span>Jump to next incomplete traveler</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Adult Travelers ({data.adultsCount})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diagnostics.travelers.slice(0, data.adultsCount).map((pres) => {
                      const t = travelers[pres.index]
                      const isActive = activeTravelerIndex === pres.index
                      return (
                        <button
                          key={pres.index}
                          type="button"
                          onClick={() => navigateToTraveler(pres.index, pres.primaryMissingField)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isActive
                              ? 'border-[#00aeef] bg-[#00aeef]/10 ring-2 ring-[#00aeef]/30 shadow-sm'
                              : pres.status === 'complete'
                                ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20'
                                : pres.status === 'needs_attention'
                                  ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                                pres.status === 'complete'
                                  ? 'bg-emerald-500 text-white'
                                  : pres.status === 'needs_attention'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {pres.status === 'complete'
                                ? '✓'
                                : pres.status === 'needs_attention'
                                  ? '⚠'
                                  : pres.travelerNumber}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                                {t.firstName && t.lastName
                                  ? `${t.firstName} ${t.lastName}`
                                  : pres.index === 0
                                    ? 'Lead Traveler'
                                    : `Traveler ${pres.travelerNumber}`}
                              </span>
                              <span
                                className={`text-[10px] block truncate ${
                                  pres.status === 'needs_attention'
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : 'text-slate-400'
                                }`}
                              >
                                {pres.status === 'needs_attention'
                                  ? pres.missingFieldsSummary
                                  : pres.index === 0
                                    ? 'Lead Traveler • Adult'
                                    : 'Adult Companion'}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-semibold flex-shrink-0 ml-2 ${
                              isActive
                                ? 'text-[#00aeef]'
                                : pres.status === 'needs_attention'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {isActive
                              ? 'Editing'
                              : pres.status === 'complete'
                                ? 'Ready'
                                : pres.status === 'needs_attention'
                                  ? 'Fix →'
                                  : '+ Details'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {data.childrenCount > 0 && (
                  <div className="mt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Children & Infants ({data.childrenCount})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {diagnostics.travelers.slice(data.adultsCount).map((pres) => {
                        const t = travelers[pres.index]
                        const isActive = activeTravelerIndex === pres.index
                        const childNumber = pres.index - data.adultsCount + 1
                        return (
                          <button
                            key={pres.index}
                            type="button"
                            onClick={() => navigateToTraveler(pres.index, pres.primaryMissingField)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isActive
                                ? 'border-[#00aeef] bg-[#00aeef]/10 ring-2 ring-[#00aeef]/30 shadow-sm'
                                : pres.status === 'complete'
                                  ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20'
                                  : pres.status === 'needs_attention'
                                    ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                                  pres.status === 'complete'
                                    ? 'bg-emerald-500 text-white'
                                    : pres.status === 'needs_attention'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                {pres.status === 'complete'
                                  ? '✓'
                                  : pres.status === 'needs_attention'
                                    ? '⚠'
                                    : pres.travelerNumber}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                                  {t.firstName && t.lastName
                                    ? `${t.firstName} ${t.lastName}`
                                    : `Child ${childNumber}`}
                                </span>
                                <span
                                  className={`text-[10px] block truncate ${
                                    pres.status === 'needs_attention'
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : 'text-indigo-500 dark:text-indigo-400 font-medium'
                                  }`}
                                >
                                  {pres.status === 'needs_attention'
                                    ? pres.missingFieldsSummary
                                    : t.type === 'infant'
                                      ? `Infant (Age ${t.declaredAge ?? 1} • Free)`
                                      : `Child (Age ${t.declaredAge ?? 6} • ${t.beddingMode === 'extra_bed' ? 'Extra Bed' : 'Sharing Bed'})`}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-semibold flex-shrink-0 ml-2 ${
                                isActive
                                  ? 'text-[#00aeef]'
                                  : pres.status === 'needs_attention'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {isActive
                                ? 'Editing'
                                : pres.status === 'complete'
                                  ? 'Ready'
                                  : pres.status === 'needs_attention'
                                    ? 'Fix →'
                                    : '+ Details'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTraveler && activePres && (
                  <div
                    ref={activeEditorRef}
                    className="mt-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#00aeef]/40 dark:border-[#00aeef]/30 shadow-md flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>✍️</span>
                          <span>
                            {isLeadActive
                              ? 'Traveler 1 (Lead Traveler)'
                              : activeTraveler.type === 'adult'
                                ? `Traveler ${activeTravelerIndex + 1} (Adult Companion)`
                                : `Traveler ${activeTravelerIndex + 1} (${activeTraveler.type === 'infant' ? 'Infant' : 'Child'})`}
                          </span>
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {activeTraveler.type === 'child' || activeTraveler.type === 'infant'
                            ? `Declared Age: ${activeTraveler.declaredAge} years • ${activeTraveler.beddingMode === 'extra_bed' ? 'Extra Bed' : 'Sharing Bed'}`
                            : 'Standard adult package traveler'}
                        </span>
                      </div>
                      <Badge
                        variant={
                          activePres.status === 'complete'
                            ? 'success'
                            : activePres.status === 'needs_attention'
                              ? 'accent'
                              : 'outline'
                        }
                        size="sm"
                      >
                        {activePres.status === 'complete'
                          ? '✓ Ready'
                          : activePres.status === 'needs_attention'
                            ? '⚠ Needs Attention'
                            : 'Not Started'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        ref={firstNameInputRef}
                        label="First / Given Name *"
                        value={activeTraveler.firstName}
                        error={activeFieldErrors.firstName}
                        helperText={
                          !activeFieldErrors.firstName
                            ? "Please enter traveler's legal first name"
                            : undefined
                        }
                        onChange={(e) =>
                          updateTravelerField(activeTravelerIndex, 'firstName', e.target.value)
                        }
                        placeholder="e.g. Alexander"
                      />
                      <Input
                        ref={lastNameInputRef}
                        label="Last / Family Name *"
                        value={activeTraveler.lastName}
                        error={activeFieldErrors.lastName}
                        helperText={
                          !activeFieldErrors.lastName
                            ? "Please enter traveler's legal last name"
                            : undefined
                        }
                        onChange={(e) =>
                          updateTravelerField(activeTravelerIndex, 'lastName', e.target.value)
                        }
                        placeholder="e.g. Vance"
                      />

                      {isLeadActive && (
                        <>
                          <Input
                            ref={emailInputRef}
                            label="Trip Contact Email *"
                            type="email"
                            value={activeTraveler.email || ''}
                            error={activeFieldErrors.email}
                            helperText={
                              !activeFieldErrors.email
                                ? 'Tickets and booking confirmations will be sent here'
                                : undefined
                            }
                            onChange={(e) =>
                              updateTravelerField(0, 'email', e.target.value)
                            }
                            placeholder="e.g. name@example.com"
                          />
                          <Input
                            ref={phoneInputRef}
                            label="Trip Contact Phone *"
                            type="tel"
                            value={activeTraveler.phone || ''}
                            error={activeFieldErrors.phone}
                            helperText={
                              !activeFieldErrors.phone
                                ? 'Required for urgent trip journey and departure alerts'
                                : undefined
                            }
                            onChange={(e) =>
                              updateTravelerField(0, 'phone', e.target.value)
                            }
                            placeholder="e.g. +20 100 123 4567"
                          />
                        </>
                      )}

                      <div>
                        <Input
                          ref={dobInputRef}
                          label={
                            activeTraveler.type === 'child' || activeTraveler.type === 'infant'
                              ? 'Date of Birth (Child Age Verification) *'
                              : 'Date of Birth (Optional)'
                          }
                          type="date"
                          value={activeTraveler.dateOfBirth || ''}
                          error={activeFieldErrors.dateOfBirth}
                          helperText={
                            activeTraveler.type === 'child' || activeTraveler.type === 'infant'
                              ? 'Required to verify child accommodation & age eligibility'
                              : undefined
                          }
                          onChange={(e) =>
                            updateTravelerField(activeTravelerIndex, 'dateOfBirth', e.target.value)
                          }
                        />
                      </div>

                      <Input
                        label="Nationality (Optional)"
                        value={activeTraveler.nationality || ''}
                        onChange={(e) =>
                          updateTravelerField(activeTravelerIndex, 'nationality', e.target.value)
                        }
                        placeholder="e.g. Egyptian / British"
                      />

                      <div className="sm:col-span-2">
                        <Input
                          label="Passport / National ID (Optional at booking)"
                          value={activeTraveler.passportNumber || ''}
                          onChange={(e) =>
                            updateTravelerField(
                              activeTravelerIndex,
                              'passportNumber',
                              e.target.value,
                            )
                          }
                          placeholder="Optional (can be provided before travel)"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        * Required to confirm passenger manifest
                      </span>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveAndNext(activeTravelerIndex)}
                        className="font-bold text-xs"
                      >
                        {diagnostics.incompleteTravelers.length > 1
                          ? 'Save & Next Incomplete Traveler →'
                          : 'Save Traveler'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Pickup & Meeting Location (Booking SSOT) */}
            <CheckoutPickupLocationPicker
              value={pickupLocation}
              onChange={setPickupLocation}
              destinationCityName={data.destinationCityName}
              destinationCountryName={data.destinationCountryName}
              experienceTitle={data.experienceTitle}
              experienceType={data.experienceType}
            />

            {data.availableLoyaltyPoints > 0 && (
              <Card variant="flat" padding="lg" className="border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 text-sm flex items-center justify-center font-bold">
                      ★
                    </span>
                    {applyLoyaltyTitle}
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
                      <div className="mt-2 pt-3 border-t border-amber-100 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                            Points to redeem
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {currentPointsNum.toLocaleString()} pts
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                            Discount value
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {previewPricing?.loyaltyDiscountPrice
                              ? previewPricing.loyaltyDiscountPrice.formatted
                              : isRepricing
                                ? 'Calculating...'
                                : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                            Remaining balance
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {previewPricing?.remainingLoyaltyPoints !== undefined
                              ? `${previewPricing.remainingLoyaltyPoints.toLocaleString()} pts`
                              : isRepricing
                                ? '...'
                                : `${data.availableLoyaltyPoints.toLocaleString()} pts`}
                          </span>
                        </div>
                      </div>
                      {effectivePricingError && (
                        <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
                          ⚠️ {effectivePricingError}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 italic">
                        * Points discount and estimated rewards are calculated on the server and
                        applied securely upon booking confirmation.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card variant="flat" padding="lg" className="border border-slate-200/80 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm font-bold flex items-center justify-center">
                  3
                </span>
                {paymentMethodTitle}
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

          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card variant="elevated" padding="lg" className="flex flex-col gap-6 sticky top-24">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
                {orderSummaryTitle}
              </h3>
              <div className="flex gap-4 items-center">
                <div
                  className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${data.imageUrl})` }}
                />
                <div>
                  <Badge variant="primary" size="sm" className="mb-1">
                    {data.experienceType === 'package' ? packageLabel : dailyTourLabel}
                  </Badge>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {data.experienceTitle}
                  </h4>
                  <span className="text-xs text-slate-500 block mt-1">📅 {data.departureDate}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>
                    Passengers ({data.adultsCount} Adults
                    {data.childrenCount > 0 ? `, ${data.childrenCount} Children` : ''})
                  </span>
                  <CurrencyDisplay
                    price={
                      previewPricing?.originalPrice ||
                      previewPricing?.unitPrice ||
                      data.subtotalPrice
                    }
                    size="sm"
                  />
                </div>
                {applyPoints &&
                  previewPricing?.loyaltyDiscountPrice &&
                  previewPricing.loyaltyDiscountPrice.convertedAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Loyalty Points Discount</span>
                      <span>-{previewPricing.loyaltyDiscountPrice.formatted}</span>
                    </div>
                  )}
                <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="flex items-center gap-2">
                    Total Amount
                    {isRepricing && (
                      <span className="text-xs font-normal text-slate-400 animate-pulse">
                        (Updating...)
                      </span>
                    )}
                  </span>
                  <CurrencyDisplay
                    price={previewPricing?.totalPrice || data.totalCost}
                    size="lg"
                  />
                </div>
              </div>
              <Button
                variant="accent"
                size="lg"
                className="w-full font-bold shadow-xl mt-2"
                isLoading={isSubmitting}
                onClick={handleConfirmPayment}
              >
                {confirmAndPayButton}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
