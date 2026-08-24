'use client'

import React, { useState } from 'react'
import { Card, Badge, Input, Button, CurrencyDisplay } from '@/components/ui'
import { useToast } from '@/providers'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'

export function CheckoutPage({ data }: { data: CheckoutPageDTO }) {
  const { addToast } = useToast()
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [keyRotationCounter, setKeyRotationCounter] = useState<number>(0)

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
                  <span>Passengers ({data.adultsCount} Adults)</span>
                  <CurrencyDisplay price={data.subtotalPrice} size="sm" />
                </div>

                <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount</span>
                  <CurrencyDisplay price={data.totalCost} size="lg" />
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
