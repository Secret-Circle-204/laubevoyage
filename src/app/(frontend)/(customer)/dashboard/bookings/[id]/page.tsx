import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocaleContext } from '@/lib/get-locale-context'
import { notFound, redirect } from 'next/navigation'
import { Card, Badge, Button, CurrencyDisplay } from '@/components/ui'
import { BookingDetailsLoader } from '@/application/dashboard/loaders'
import { SessionResolver } from '@/application/auth/session-resolver'

export const metadata: Metadata = {
  title: "Reservation Detail & Voucher | L'Aube Voyage Customer Portal",
  description: "View reservation details, pricing snapshot, and download e-voucher for your luxury trip.",
}

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const params = await props.params
  const bookingId = params.id

  const localeCtx = await getLocaleContext()

  const data = await BookingDetailsLoader.loadByNumber(bookingId, session.customerId, {
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
            Reservation #{data.bookingNumber}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={
            data.status === 'confirmed' || data.status === 'paid' || data.status === 'completed'
              ? 'success'
              : data.status === 'pending_admin_review'
              ? 'warning'
              : 'secondary'
          } size="md">
            {data.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>

          {data.paymentStatus === 'partially_paid' && (
            <Badge variant="warning" size="md" className="bg-amber-500/10 text-amber-500 border border-amber-500/20">
              PARTIALLY PAID
            </Badge>
          )}
          {data.paymentStatus === 'paid' && (
            <Badge variant="outline" size="md" className="text-emerald-500 border-emerald-500/30">
              PAID
            </Badge>
          )}
        </div>
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
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 font-semibold text-slate-900 dark:text-white">
                <span>Total Cost:</span>
                <CurrencyDisplay price={data.totalCost} size="sm" />
              </div>
              {data.rawPaidAmount > 0 && (
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{data.paidAmount}</span>
                </div>
              )}
              {data.rawOutstandingBalance > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-500 font-semibold pt-1">
                  <span>Outstanding Balance:</span>
                  <span>{data.outstandingBalance}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider mb-2">
              Loyalty Summary
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              {/* 1. Earning Details */}
              <div className="flex justify-between items-center">
                <span>Points Earned:</span>
                <span className="font-bold text-[#f58220]">+{data.loyaltySummary.pointsEarned} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Earning Status:</span>
                <Badge
                  variant={
                    data.loyaltySummary.earningStatus === 'credited'
                      ? 'success'
                      : data.loyaltySummary.earningStatus === 'reversed'
                      ? 'error'
                      : data.loyaltySummary.earningStatus === 'partially_reversed'
                      ? 'warning'
                      : data.loyaltySummary.earningStatus === 'pending'
                      ? 'warning'
                      : 'outline'
                  }
                  size="sm"
                >
                  {data.loyaltySummary.earningStatus.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>

              {/* 2. Redemption Details (if applicable) */}
              {(data.loyaltySummary.pointsRedeemed > 0 || data.loyaltySummary.redemptionStatus !== 'none') && (
                <>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Points Redeemed:</span>
                    <span className="font-bold text-slate-900 dark:text-white">-{data.loyaltySummary.pointsRedeemed} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Redemption Status:</span>
                    <Badge
                      variant={
                        data.loyaltySummary.redemptionStatus === 'redeemed'
                          ? 'success'
                          : data.loyaltySummary.redemptionStatus === 'refunded'
                          ? 'outline'
                          : data.loyaltySummary.redemptionStatus === 'partially_refunded'
                          ? 'warning'
                          : data.loyaltySummary.redemptionStatus === 'held'
                          ? 'warning'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {data.loyaltySummary.redemptionStatus.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {data.loyaltySummary.discountFromPointsEGP > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Loyalty Discount:</span>
                      <span className="font-bold text-emerald-600">
                        -{data.loyaltySummary.discountFromPointsEGP.toLocaleString()} EGP
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* 3. Active Hold Details (if hold is active) */}
              {data.loyaltySummary.heldPoints > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-amber-600 dark:text-amber-500 font-semibold">
                  <span>Active Points Held:</span>
                  <span>{data.loyaltySummary.heldPoints} pts</span>
                </div>
              )}
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
