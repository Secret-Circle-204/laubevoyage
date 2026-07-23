'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, Badge, Input, Button, CurrencyDisplay } from '@/components/ui'
import { useToast } from '@/providers'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'

export function CheckoutPage({ data }: { data: CheckoutPageDTO }) {
  const { addToast } = useToast()
  const [selectedGateway, setSelectedGateway] = useState<string>('stripe')
  const [couponCode, setCouponCode] = useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Traveler Details Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (couponCode.toUpperCase() === 'WELCOME10') {
      const discount = data.subtotalEGP * 0.1
      setAppliedDiscount(discount)
      addToast({ type: 'success', title: 'Coupon Applied', description: '10% promotional discount applied!' })
    } else {
      addToast({ type: 'error', title: 'Invalid Coupon', description: 'Coupon code not found or expired.' })
    }
  }

  const finalTotalEGP = data.subtotalEGP - appliedDiscount

  const handleConfirmPayment = () => {
    if (!firstName || !email) {
      addToast({ type: 'error', title: 'Missing Information', description: 'Please fill in lead traveler name and email.' })
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      addToast({
        type: 'success',
        title: 'Booking Confirmed!',
        description: `Booking #${data.bookingId} processed via ${selectedGateway.toUpperCase()}. Voucher sent to ${email}`,
      })
    }, 1500)
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
            <Card variant="flat" padding="lg">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#2e3192] text-white text-sm flex items-center justify-center">1</span>
                Lead Traveler Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alexander"
                />
                <Input
                  label="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Vance"
                />
                <Input
                  label="Email Address *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alexander@example.com"
                />
                <Input
                  label="Phone / WhatsApp *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 123 4567"
                />
              </div>
            </Card>

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

          {/* Right Column: Order Summary & Coupon */}
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

              {/* Coupon Applicator Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Promo Code (TRY: WELCOME10)"
                  className="text-xs uppercase"
                />
                <Button variant="outline" size="sm" type="submit">
                  Apply
                </Button>
              </form>

              {/* Cost Breakdown List */}
              <div className="flex flex-col gap-2.5 text-sm pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Passengers ({data.adultsCount} Adults)</span>
                  <CurrencyDisplay amountEGP={data.subtotalEGP} size="sm" />
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promo Discount (10%)</span>
                    <span>- EGP {appliedDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount</span>
                  <CurrencyDisplay amountEGP={finalTotalEGP} size="lg" />
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
