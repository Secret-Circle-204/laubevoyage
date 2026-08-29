import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { getLocaleContext } from '@/lib/get-locale-context'
import { redirect } from 'next/navigation'
import { SessionResolver } from '@/application/auth/session-resolver'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My Bookings History | L'Aube Voyage Customer Portal" }
}

interface PageProps {
  searchParams?: Promise<{
    page?: string
    status?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const sp = searchParams ? await searchParams : {}
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const currentStatus = sp.status?.toLowerCase()

  const localeCtx = await getLocaleContext()
  const data = await CustomerPortalLoader.loadBookingsHistory(session.customerId, {
    locale: localeCtx.language,
    currency: localeCtx.currency,
    page: currentPage,
    limit: 10,
    status: currentStatus,
  })

  const statusTabs = [
    { label: 'All Bookings', value: undefined },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Pending Payment', value: 'pending_payment' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Bookings History</h1>
          <p className="text-xs text-slate-500 mt-1">Review, track, and download official vouchers for all your curated voyages.</p>
        </div>
        <Badge variant="primary" size="md">{data.total} Total Bookings</Badge>
      </div>

      {/* Server-Side Database Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = currentStatus === tab.value || (!currentStatus && !tab.value)
          const href = tab.value ? `/dashboard/bookings?status=${tab.value}` : '/dashboard/bookings'

          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#2e3192] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Bookings List */}
      {data.bookings.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <span className="text-4xl mb-3 block">🧳</span>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No bookings found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {currentStatus ? `There are no bookings matching status "${currentStatus}".` : 'You have not booked any voyages yet.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.bookings.map((booking) => (
            <Card key={booking.id} variant="flat" padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${booking.experienceImage})` }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#00aeef]">{booking.reference}</span>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'completed' ? 'primary' : 'warning'} size="sm">
                      {booking.status.toUpperCase()}
                    </Badge>
                    {booking.paymentStatus === 'partially_paid' && (
                      <Badge variant="warning" size="sm" className="bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        PARTIALLY PAID
                      </Badge>
                    )}
                    {booking.paymentStatus === 'paid' && (
                      <Badge variant="outline" size="sm" className="text-emerald-500 border-emerald-500/30">
                        PAID
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{booking.experienceTitle}</h3>
                  <span className="text-xs text-slate-500">📅 {booking.departureDate} • {booking.passengersCount} Passengers</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <CurrencyDisplay price={booking.totalCost} size="md" />
                {booking.paymentStatus === 'partially_paid' && booking.outstandingBalance && (
                  <div className="text-right mt-1">
                    <span className="text-[11px] text-slate-500 block">
                      Paid: <strong className="text-slate-700 dark:text-slate-300">{booking.paidAmount?.formatted}</strong>
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500 block">
                      Remaining: {booking.outstandingBalance.formatted}
                    </span>
                  </div>
                )}
                <Link href={`/dashboard/bookings/${booking.reference}`}>
                  <Button variant="accent" size="sm" className="mt-2">
                    View Voucher
                  </Button>
                </Link>
              </div>
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
                href={`/dashboard/bookings?page=${data.page - 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
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
                href={`/dashboard/bookings?page=${data.page + 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
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
