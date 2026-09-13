'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useToast, useLocale } from '@/providers'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { resolvePricingAction } from '@/application/actions/pricing-actions'
import { ManifestDiagnosticsPresenter } from '@/application/booking/manifest-diagnostics'
import type { TravelerInput } from '@/domains/booking/types'
import { CheckoutHeader } from './CheckoutHeader'
import {
  TravelerManifestSection,
  type TravelerFormState,
  type TravelerManifestSectionHandle,
} from './TravelerManifestSection'
import {
  CheckoutPickupLocationPicker,
  type PickupLocationValue,
} from './CheckoutPickupLocationPicker'
import { LoyaltyRedemptionSection, type PricingPreviewState } from './LoyaltyRedemptionSection'
import { PaymentGatewaySection } from './PaymentGatewaySection'
import { CheckoutOrderSummary } from './CheckoutOrderSummary'

export function CheckoutPage({ data }: { data: CheckoutPageDTO }) {
  const { addToast } = useToast()
  const { locale } = useLocale()
  const manifestRef = useRef<TravelerManifestSectionHandle>(null)
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [keyRotationCounter, setKeyRotationCounter] = useState<number>(0)
  const [applyPoints, setApplyPoints] = useState<boolean>(false)
  const [pointsToRedeem, setPointsToRedeem] = useState<number | string>('')
  const [pickupLocation, setPickupLocation] = useState<PickupLocationValue | null>(() => {
    if (data.initialPickupLocation) {
      return {
        label: data.initialPickupLocation.label,
        address: data.initialPickupLocation.address,
        latitude: data.initialPickupLocation.latitude,
        longitude: data.initialPickupLocation.longitude,
        instructions: data.initialPickupLocation.instructions,
        source: data.initialPickupLocation.source,
      }
    }
    return null
  })

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

  const isInputInvalid =
    applyPoints &&
    pointsToRedeem !== '' &&
    (!Number.isInteger(Number(pointsToRedeem)) || Number(pointsToRedeem) < 0)

  const inputValidationError = isInputInvalid ? 'Points must be a valid non-negative integer.' : null
  const effectivePricingError = inputValidationError || pricingError

  // Initialize traveler list based on booking capacity or hydrated manifest
  const [travelers, setTravelers] = useState<TravelerFormState[]>(() => {
    if (data.initialTravelers && data.initialTravelers.length > 0) {
      return data.initialTravelers.map((t, idx) => {
        const isChild = t.type === 'child' || t.type === 'infant' || idx >= data.adultsCount
        const childIdx = idx - data.adultsCount
        return {
          firstName: t.firstName || '',
          lastName: t.lastName || '',
          email: t.email || '',
          phone: t.phone || '',
          dateOfBirth: t.dateOfBirth || '',
          passportNumber: t.passportNumber || '',
          nationality: t.nationality || '',
          type: (t.type || (isChild ? 'child' : 'adult')) as 'adult' | 'child' | 'infant',
          declaredAge: data.childAges?.[childIdx] ?? 6,
          beddingMode: data.childBeddingModes?.[childIdx] ?? 'sharing_bed',
        }
      })
    }

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
  }

  const handleSaveAndNext = (currentIndex: number) => {
    // When saved, if all travelers are valid, notify
    const diagnostics = ManifestDiagnosticsPresenter.evaluate(
      travelers,
      data.adultsCount,
      data.childrenCount,
      { [currentIndex]: true },
    )
    if (diagnostics.incompleteTravelers.length === 0) {
      addToast({
        type: 'success',
        title: 'Passenger Manifest Verified',
        description: 'All passenger records are complete and ready for reservation confirmation.',
      })
    }
  }

  // Session idempotency key management
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')

  useEffect(() => {
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

  // Live Repricing Hook with debounce and race-condition cancellation
  useEffect(() => {
    let isCancelled = false
    const requestId = ++latestPricingRequestIdRef.current

    const pointsNum =
      applyPoints && pointsToRedeem !== '' && typeof pointsToRedeem === 'number'
        ? pointsToRedeem
        : applyPoints && pointsToRedeem !== '' && !isNaN(Number(pointsToRedeem))
          ? Number(pointsToRedeem)
          : 0

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

  // Primary confirmation handler
  const handleConfirmPayment = async () => {
    // Check manifest validation
    const touchedAll: Record<number, boolean> = {}
    travelers.forEach((_, idx) => {
      touchedAll[idx] = true
    })
    const diagnostics = ManifestDiagnosticsPresenter.evaluate(
      travelers,
      data.adultsCount,
      data.childrenCount,
      touchedAll,
    )

    if (!diagnostics.valid) {
      if (diagnostics.firstIncompleteIndex !== -1) {
        manifestRef.current?.navigateToTraveler(
          diagnostics.firstIncompleteIndex,
          diagnostics.travelers[diagnostics.firstIncompleteIndex]?.primaryMissingField,
          true,
        )
      }
      const firstIncomplete = diagnostics.incompleteTravelers[0]
      const firstLabel = firstIncomplete
        ? firstIncomplete.index === 0
          ? 'Lead Traveler'
          : `Traveler ${firstIncomplete.travelerNumber}`
        : 'Traveler'
      const firstMissing = firstIncomplete
        ? firstIncomplete.missingFieldsSummary.replace('Missing: ', '')
        : 'details'
      addToast({
        type: 'error',
        title: 'Almost there',
        description: `${firstLabel} needs ${firstMissing} before you can continue.`,
      })
      return
    }

    if (effectivePricingError) {
      const errorTitle =
        applyPoints && pointsToRedeem !== ''
          ? 'Invalid Points Selection'
          : 'Pricing Resolution Issue'
      addToast({
        type: 'error',
        title: errorTitle,
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
        travelers: travelers as unknown as TravelerInput[],
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
          title: 'Reservation Secured',
          description: `Transaction #${txId} initiated successfully.`,
        })

        if (checkoutUrl) {
          window.location.href = checkoutUrl
        }
      } else {
        const errorMsg =
          'error' in res && typeof res.error === 'string' ? res.error : 'Booking confirmation failed'
        const failureTitle =
          'failureStage' in res && (res as { failureStage?: string }).failureStage === 'payment'
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

  return (
    <div className="py-10 sm:py-14 pb-28 lg:pb-14 bg-background min-h-screen text-foreground selection:bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1. Sovereign Vault Header */}
        <CheckoutHeader bookingId={data.bookingId} locale={locale} />

        {/* 2. Main Reservation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Traveler Manifest, Pickup, Loyalty, Gateway */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* Step 1: Traveler Manifest */}
            <TravelerManifestSection
              ref={manifestRef}
              travelers={travelers}
              adultsCount={data.adultsCount}
              childrenCount={data.childrenCount}
              onUpdateField={updateTravelerField}
              onSaveAndNext={handleSaveAndNext}
              locale={locale}
            />

            {/* Step 2: Pickup & Meeting Location (SSOT directly reused) */}
            <CheckoutPickupLocationPicker
              value={pickupLocation}
              onChange={setPickupLocation}
              destinationCityName={data.destinationCityName}
              destinationCountryName={data.destinationCountryName}
              experienceTitle={data.experienceTitle}
              experienceType={data.experienceType}
            />

            {/* Step 3: Loyalty Redemption */}
            <LoyaltyRedemptionSection
              availableLoyaltyPoints={data.availableLoyaltyPoints}
              minRedemptionPoints={data.minRedemptionPoints}
              redemptionStepUnit={data.redemptionStepUnit}
              applyPoints={applyPoints}
              pointsToRedeem={pointsToRedeem}
              previewPricing={previewPricing}
              isRepricing={isRepricing}
              effectivePricingError={effectivePricingError}
              onToggleApplyPoints={setApplyPoints}
              onChangePointsToRedeem={setPointsToRedeem}
              locale={locale}
            />

            {/* Step 4: Payment Gateway Selection */}
            <PaymentGatewaySection
              gateways={data.gateways}
              selectedGateway={selectedGateway}
              onSelectGateway={setSelectedGateway}
              locale={locale}
            />
          </div>

          {/* Right Column: Adaptive Order Summary (Desktop Sticky Ledger) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <CheckoutOrderSummary
              data={data}
              previewPricing={previewPricing}
              applyPoints={applyPoints}
              isRepricing={isRepricing}
              isSubmitting={isSubmitting}
              onConfirmPayment={handleConfirmPayment}
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
