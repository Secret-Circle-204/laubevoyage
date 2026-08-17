import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocaleContext } from '@/lib/get-locale-context'
import { notFound } from 'next/navigation'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'

export const metadata: Metadata = {
  title: "Reservation Detail & Voucher | L'Aube Voyage Customer Portal",
  description: "View reservation details, pricing snapshot, and download e-voucher for your luxury trip.",
}

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const bookingId = params.id

  const localeCtx = await getLocaleContext()

  const data = await BookingDetailsLoader.loadByNumber(bookingId, {
    locale: localeCtx.language,
    currency: localeCtx.currency,
  })
  if (!data) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 flex-grow">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/bookings" className="text-xs font-bold text-slate-500 hover:text-[#00aeef] transition-colors mb-1 block">
            ← Back to All Reservations
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Reservation #LV-{bookingId.padStart(5, '0')}
          </h1>
        </div>

        <Badge variant="success" size="md">
          {data.status.toUpperCase()}
        </Badge>
      </div>

      <Card variant="flat" padding="lg" className="space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data.experienceTitle}</h2>
          <span className="text-xs text-slate-500 mt-1 block">Departure Date: {data.departureDate} • {data.passengersCount} Passengers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider mb-2">
              Pricing Snapshot (Immutable)
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Base Price (EGP):</span>
                <span className="font-bold text-slate-900 dark:text-white">{data.basePriceText}</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Rate Snapshot:</span>
                <span className="font-mono">{data.exchangeRateText}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 font-bold text-slate-900 dark:text-white">
                <span>Total Paid:</span>
                <CurrencyDisplay price={data.totalCost} size="sm" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider mb-2">
              Loyalty Summary
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Points Earned:</span>
                <span className="font-bold text-[#f58220]">+{data.pointsEarned} pts</span>
              </div>
              <div className="flex justify-between">
                <span>Ledger Status:</span>
                <span className="text-emerald-600 font-bold">Credited</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="outline" size="sm">
            🖨️ Download PDF Voucher
          </Button>
        </div>
      </Card>
    </div>
  )
}
