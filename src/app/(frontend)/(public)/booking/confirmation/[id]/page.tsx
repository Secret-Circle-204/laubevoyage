import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'

export const metadata: Metadata = {
  title: "Booking Confirmation | L'Aube Voyage",
  description: "View your official L'Aube Voyage booking confirmation and manage trip details.",
}

export default async function BookingConfirmationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const bookingId = params.id

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const data = await BookingDetailsLoader.loadByNumber(bookingId, { locale, currency })
  if (!data) {
    notFound()
  }

  const { getDomainServices } = await import('@/domains/factory')
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale, cookieCurrency: currency })

  const thankYou = localization.translateUiKey('bookingConfirmation.thankYou', ctx)
  const refSubtitle = localization.translateUiKey('bookingConfirmation.refSubtitle', ctx)
  const statusLabel = localization.translateUiKey('bookingConfirmation.statusLabel', ctx)
  const totalPriceLabel = localization.translateUiKey('bookingConfirmation.totalPriceLabel', ctx)

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="flat" padding="lg" className="text-center shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mx-auto text-4xl">
            ✓
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              BOOKING {data.status.toUpperCase()}
            </Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {thankYou}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {refSubtitle}{' '}
              <strong className="font-mono text-[#00aeef]">#LV-{data.bookingNumber.padStart(5, '0')}</strong>
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{statusLabel}</span>
              <span className="font-bold text-emerald-600 uppercase">
                {data.status === 'confirmed'
                  ? data.rawOutstandingBalance > 0
                    ? 'Confirmed (Outstanding Balance)'
                    : 'Confirmed & Paid'
                  : data.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{totalPriceLabel}</span>
              <CurrencyDisplay price={data.totalCost} size="sm" />
            </div>
            {data.rawPaidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <CurrencyDisplay price={data.paidAmount} size="sm" />
              </div>
            )}
            {data.rawOutstandingBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500 text-amber-600 dark:text-amber-500 font-medium">Outstanding Balance:</span>
                <CurrencyDisplay price={data.outstandingBalance} size="sm" />
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Loyalty Points Earned:</span>
              <span className="font-bold text-[#f58220]">+{data.pointsEarned} Points</span>
            </div>

            {data.pickupLocation && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg">📍</span>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">
                        Pickup / Meeting Location
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                        {data.pickupLocation.label}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                        {data.pickupLocation.address}
                      </span>
                      {data.pickupLocation.instructions && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded inline-block mt-1.5 border border-amber-200/50 dark:border-amber-800/40">
                          <strong>Driver Note:</strong> {data.pickupLocation.instructions}
                        </span>
                      )}
                    </div>
                  </div>
                  {data.pickupLocation.latitude && data.pickupLocation.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${data.pickupLocation.latitude},${data.pickupLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#00aeef] hover:underline whitespace-nowrap pt-1"
                    >
                      View on Map ↗
                    </a>
                  )}
                </div>
              </div>
            )}
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
