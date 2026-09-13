import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, CurrencyDisplay, Button, EmptyState } from '@/components/ui'
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

// SVG Icons
function CreditCardIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6 3.75h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 5.25v13.5a1.5 1.5 0 001.5 1.5z" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function RotateCcwIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  )
}

function PinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function UsersIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
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
    { label: 'All Records', value: undefined, icon: null },
    { label: 'Paid & Settled', value: 'paid', icon: CreditCardIcon },
    { label: 'Outstanding / Partial', value: 'pending_payment', icon: ClockIcon },
    { label: 'Cancelled & Refunded', value: 'cancelled', icon: RotateCcwIcon },
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
          <h1 className="text-3xl font-extrabold text-foreground">Invoices & Receipts</h1>
          <p className="text-xs text-muted-foreground mt-1">Your official travel service invoices, payment receipts, and billing history.</p>
        </div>
        <Badge variant="primary" size="md">{data.total} Total Records</Badge>
      </div>

      {/* Server-Side Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = currentStatus === tab.value || (!currentStatus && !tab.value)
          const href = tab.value ? `/dashboard/invoices?status=${tab.value}` : '/dashboard/invoices'
          const Icon = tab.icon

          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 border border-border/70'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 opacity-90" />}
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Financial Records List */}
      {data.invoices.length === 0 ? (
        <EmptyState
          title="No financial records found"
          description={
            currentStatus
              ? `There are no financial records matching status "${currentStatus}".`
              : 'No invoices or payment receipts issued yet.'
          }
          icon="generic"
        />
      ) : (
        <div className="flex flex-col gap-5">
          {data.invoices.map((inv) => (
            <Card key={inv.id} variant="flat" padding="lg" className="flex flex-col gap-4 border border-border/70 shadow-sm">
              {/* 1. Document / Booking Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 flex-wrap">
                  {getBookingStatusBadge(inv.bookingStatus)}
                  {getPaymentStatusBadge(inv.paymentStatus)}
                  <span className="text-xs font-semibold text-foreground">
                    Booking: <span className="text-primary font-bold">{inv.bookingNumber}</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                  Booked: {inv.date}
                </span>
              </div>

              {/* 2. Service & Travel Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {inv.productTypeLabel && <Badge variant="outline" size="sm">{inv.productTypeLabel}</Badge>}
                    {inv.destinationCity && (
                      <span className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                        <PinIcon className="w-3.5 h-3.5 text-primary" />
                        {inv.destinationCity}
                      </span>
                    )}
                    {inv.durationText && (
                      <span className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5 opacity-70" />
                        {inv.durationText}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-foreground">{inv.title}</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                      <span><strong>Departure:</strong> {inv.departureDate}{inv.departureTime ? ` at ${inv.departureTime}` : ''}
                      {inv.destinationTimezone ? ` (${inv.destinationTimezone})` : ''}
                      {inv.endDate && <span> • <strong>End Date:</strong> {inv.endDate}</span>}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <UsersIcon className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                      <span><strong>Lead Traveler:</strong> {inv.leadTravelerName} • <strong>Passengers:</strong> {inv.passengersCount}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/bookings/${inv.bookingNumber}`}>
                    <Button variant="accent" size="sm">
                      View Reservation Details →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* 3. Commercial Financial Summary Box */}
              <div className="p-3.5 rounded-xl bg-card-elevated/70 border border-border/80 text-xs shadow-2xs">
                {/* Price Breakdown Sub-row (if basePrice or discounts exist) */}
                {(inv.basePrice || inv.loyaltyDiscount || inv.promoDiscount) && (
                  <div className="flex items-center gap-4 flex-wrap pb-2 mb-2 border-b border-border/50 text-muted-foreground text-[11px]">
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
                    <span className="ml-auto text-muted-foreground/70">Plan: <strong className="text-foreground">{inv.paymentPlan}</strong></span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-medium">Total Invoiced:</span>
                    <CurrencyDisplay price={inv.totalAmount} size="sm" />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-medium">Amount Paid:</span>
                    <CurrencyDisplay price={inv.paidAmount} size="sm" />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-medium">Balance Due:</span>
                    {inv.isCancelled ? (
                      <span className="font-semibold text-muted-foreground">
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
                <div className="mt-1 pt-3 border-t border-border/50">
                  <span className="text-xs font-bold text-foreground block mb-2">
                    Official Payment Receipts ({inv.receipts.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    {inv.receipts.map((rcpt) => (
                      <div key={rcpt.attemptId} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-card border border-border/50">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                          <span className="font-semibold text-foreground">{rcpt.provider}</span>
                          {rcpt.transactionReference && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              (Ref: {rcpt.transactionReference})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 sm:mt-0">
                          <span className="text-muted-foreground text-[11px]">{rcpt.date}</span>
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


