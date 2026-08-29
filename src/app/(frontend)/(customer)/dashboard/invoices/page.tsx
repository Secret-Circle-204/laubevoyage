import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { CustomerInvoicesLoader } from '@/application/booking/loaders-invoices'
import { getLocaleContext } from '@/lib/get-locale-context'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Invoices & Receipts | L'Aube Voyage Customer Portal" }
}

interface PageProps {
  searchParams?: Promise<{
    page?: string
    status?: string
    paymentStatus?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const sp = searchParams ? await searchParams : {}
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const currentStatus = (sp.status || sp.paymentStatus)?.toLowerCase()

  const localeCtx = await getLocaleContext()
  const data = await CustomerInvoicesLoader.load(session.customerId, {
    page: currentPage,
    limit: 10,
    status: currentStatus,
    locale: localeCtx.language,
    currency: localeCtx.currency,
  })

  const statusTabs = [
    { label: 'All Records', value: undefined },
    { label: 'Paid & Settled', value: 'paid', icon: '💳' },
    { label: 'Outstanding / Partial', value: 'pending_payment', icon: '⏳' },
    { label: 'Cancelled & Refunded', value: 'cancelled', icon: '🔄' },
  ]

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <Badge variant="success" size="sm">{status.toUpperCase()}</Badge>
      case 'cancelled':
        return <Badge variant="error" size="sm">CANCELLED</Badge>
      case 'refunded':
        return <Badge variant="warning" size="sm">REFUNDED</Badge>
      case 'pending_admin_review':
        return <Badge variant="warning" size="sm">PENDING REVIEW</Badge>
      case 'pending_payment':
        return <Badge variant="warning" size="sm">PENDING PAYMENT</Badge>
      default:
        return <Badge variant="secondary" size="sm" className="capitalize">{status.replace(/_/g, ' ')}</Badge>
    }
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge variant="success" size="sm">PAID</Badge>
      case 'partially_paid':
        return <Badge variant="warning" size="sm" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">PARTIALLY PAID</Badge>
      case 'refunded':
      case 'partially_refunded':
        return <Badge variant="warning" size="sm">REFUNDED</Badge>
      case 'unpaid':
        return <Badge variant="secondary" size="sm">UNPAID</Badge>
      default:
        return <Badge variant="secondary" size="sm" className="capitalize">{paymentStatus.replace(/_/g, ' ')}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Invoices & Receipts</h1>
          <p className="text-xs text-slate-500 mt-1">Your official travel service invoices, payment receipts, and billing history.</p>
        </div>
        <Badge variant="primary" size="md">{data.total} Total Records</Badge>
      </div>

      {/* Server-Side Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = currentStatus === tab.value || (!currentStatus && !tab.value)
          const href = tab.value ? `/dashboard/invoices?status=${tab.value}` : '/dashboard/invoices'

          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#2e3192] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Financial Records List */}
      {data.invoices.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <span className="text-4xl mb-3 block">🧾</span>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No financial records found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {currentStatus
              ? `There are no financial records matching status "${currentStatus}".`
              : 'No invoices or payment receipts issued yet.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {data.invoices.map((inv) => (
            <Card key={inv.id} variant="flat" padding="lg" className="flex flex-col gap-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              {/* 1. Document / Booking Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  {getBookingStatusBadge(inv.bookingStatus)}
                  {getPaymentStatusBadge(inv.paymentStatus)}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Booking: <span className="font-mono text-[#00aeef]">{inv.bookingNumber}</span>
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  📅 Booked: {inv.date}
                </span>
              </div>

              {/* 2. Service & Travel Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {inv.productTypeLabel && <Badge variant="outline" size="sm">{inv.productTypeLabel}</Badge>}
                    {inv.destinationCity && (
                      <span className="text-xs text-slate-500 font-medium">📍 {inv.destinationCity}</span>
                    )}
                    {inv.durationText && (
                      <span className="text-xs text-slate-500 font-medium">⏱️ {inv.durationText}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{inv.title}</h3>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>
                      📅 <strong>Departure:</strong> {inv.departureDate}{inv.departureTime ? ` at ${inv.departureTime}` : ''}
                      {inv.destinationTimezone ? ` (${inv.destinationTimezone})` : ''}
                      {inv.endDate && <span> • <strong>End Date:</strong> {inv.endDate}</span>}
                    </p>
                    <p>
                      👤 <strong>Lead Traveler:</strong> {inv.leadTravelerName} • <strong>Passengers:</strong> {inv.passengersCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/bookings/${inv.bookingNumber}`}>
                    <Button variant="accent" size="sm">
                      View Reservation & Voucher →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* 3. Commercial Financial Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 text-xs">
                {/* Price Breakdown Sub-row (if basePrice or discounts exist) */}
                {(inv.basePrice || inv.loyaltyDiscount || inv.promoDiscount) && (
                  <div className="flex items-center gap-4 flex-wrap pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-500 text-[11px]">
                    {inv.basePrice && (
                      <span>Base Price: <CurrencyDisplay price={inv.basePrice} size="sm" /></span>
                    )}
                    {inv.loyaltyDiscount && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Loyalty Discount: -<CurrencyDisplay price={inv.loyaltyDiscount} size="sm" />
                      </span>
                    )}
                    {inv.promoDiscount && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Promo Discount: -<CurrencyDisplay price={inv.promoDiscount} size="sm" />
                      </span>
                    )}
                    <span className="ml-auto text-slate-400">Plan: <strong className="text-slate-600 dark:text-slate-300">{inv.paymentPlan}</strong></span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Total Invoiced:</span>
                    <CurrencyDisplay price={inv.totalAmount} size="sm" />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Amount Paid:</span>
                    <CurrencyDisplay price={inv.paidAmount} size="sm" />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Balance Due:</span>
                    {inv.isCancelled ? (
                      <span className="font-semibold text-slate-400 dark:text-slate-500">
                        $0.00 (Cancelled / Voided)
                      </span>
                    ) : inv.paymentStatus === 'paid' ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        <CurrencyDisplay price={inv.outstandingBalance} size="sm" /> (Settled)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-500">
                        <CurrencyDisplay price={inv.outstandingBalance} size="sm" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Payment Receipts Ledger */}
              {inv.receipts.length > 0 && (
                <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Official Payment Receipts ({inv.receipts.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    {inv.receipts.map((rcpt) => (
                      <div key={rcpt.attemptId} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{rcpt.provider}</span>
                          {rcpt.transactionReference && (
                            <span className="font-mono text-[11px] text-slate-400">
                              (Ref: {rcpt.transactionReference})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 sm:mt-0">
                          <span className="text-slate-400 text-[11px]">{rcpt.date}</span>
                          <CurrencyDisplay price={rcpt.amount} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Server-Side Pagination Bar */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>

          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Link
                href={`/dashboard/invoices?page=${data.page - 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                ← Previous
              </span>
            )}

            {data.page < data.totalPages ? (
              <Link
                href={`/dashboard/invoices?page=${data.page + 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


