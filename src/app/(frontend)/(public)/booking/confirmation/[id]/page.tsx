import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'

export const metadata: Metadata = {
  title: "Booking Confirmation & Voucher | L'Aube Voyage",
  description: "View your official L'Aube Voyage booking confirmation, download your e-voucher, and manage trip details.",
}

export default async function BookingConfirmationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const bookingId = params.id

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="flat" padding="lg" className="text-center shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mx-auto text-4xl">
            ✓
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              BOOKING CONFIRMED
            </Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Thank You For Your Order!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Your reservation reference number is{' '}
              <strong className="font-mono text-[#00aeef]">#LV-{bookingId.padStart(5, '0')}</strong>
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600 uppercase">Confirmed & Paid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Snapshot:</span>
              <CurrencyDisplay amountEGP={15000} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loyalty Points Earned:</span>
              <span className="font-bold text-[#f58220]">+150 Points</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link href="/dashboard/bookings" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                View in Customer Dashboard →
              </Button>
            </Link>
            <Link href="/experiences" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full">
                Explore More Experiences
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
