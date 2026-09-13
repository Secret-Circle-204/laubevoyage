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

// SVG Icons
function CheckIcon({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
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
    <div className="py-16 bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="flat" padding="lg" className="text-center shadow-xl border border-border space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckIcon className="w-10 h-10" />
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              BOOKING {data.status.toUpperCase()}
            </Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {thankYou}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {refSubtitle}{' '}
              <strong className="text-primary font-bold">#LV-{data.bookingNumber.padStart(5, '0')}</strong>
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-xs text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{statusLabel}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                {data.status === 'confirmed'
                  ? data.rawOutstandingBalance > 0
                    ? 'Confirmed (Outstanding Balance)'
                    : 'Confirmed & Paid'
                  : data.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{totalPriceLabel}</span>
              <CurrencyDisplay price={data.totalCost} size="sm" />
            </div>
            {data.rawPaidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <CurrencyDisplay price={data.paidAmount} size="sm" />
              </div>
            )}
            {data.rawOutstandingBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 dark:text-amber-500 font-medium">Outstanding Balance:</span>
                <CurrencyDisplay price={data.outstandingBalance} size="sm" />
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loyalty Points Earned:</span>
              <span className="font-bold text-[#f58220]">+{data.pointsEarned} Points</span>
            </div>

            {data.pickupLocation && (
              <div className="pt-3 border-t border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <PinIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold block uppercase">
                        Pickup / Meeting Location
                      </span>
                      <span className="font-bold text-foreground block mt-0.5">
                        {data.pickupLocation.label}
                      </span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
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
