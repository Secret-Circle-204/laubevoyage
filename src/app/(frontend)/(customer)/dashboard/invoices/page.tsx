import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { CustomerInvoicesLoader } from '@/application/booking/loaders-invoices'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Invoices & Receipts | L'Aube Voyage Customer Portal" }
}

interface PageProps {
  searchParams?: Promise<{
    page?: string
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
  const currentPaymentStatus = sp.paymentStatus?.toLowerCase()

  const data = await CustomerInvoicesLoader.load(session.customerId, {
    page: currentPage,
    limit: 10,
    paymentStatus: currentPaymentStatus,
  })

  const statusTabs = [
    { label: 'All Invoices', value: undefined },
    { label: 'Paid & Settled', value: 'successful', icon: '💳' },
    { label: 'Refunded', value: 'refunded', icon: '🔄' },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'successful':
        return <Badge variant="success" size="sm">PAID</Badge>
      case 'refunded':
      case 'partially_refunded':
        return <Badge variant="warning" size="sm">REFUNDED</Badge>
      default:
        return <Badge variant="accent" size="sm" className="capitalize">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Invoices & Receipts</h1>
          <p className="text-xs text-slate-500 mt-1">Your booking invoices, official receipts, and payment records.</p>
        </div>
        <Badge variant="primary" size="md">{data.total} Total Invoices</Badge>
      </div>

      {/* Server-Side Database Payment Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = currentPaymentStatus === tab.value || (!currentPaymentStatus && !tab.value)
          const href = tab.value ? `/dashboard/invoices?paymentStatus=${tab.value}` : '/dashboard/invoices'

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

      {/* Invoices List */}
      {data.invoices.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <span className="text-4xl mb-3 block">🧾</span>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No invoices found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {currentPaymentStatus
              ? `There are no invoices matching status "${currentPaymentStatus}".`
              : 'No invoices or tax receipts issued yet.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.invoices.map((inv) => (
            <Card key={inv.id} variant="flat" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {getStatusBadge(inv.status)}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Booking: <span className="font-mono text-[#00aeef]">{inv.bookingNumber}</span>
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{inv.title}</h3>
                <span className="text-xs text-slate-500">
                  📅 {inv.date} • Receipt Reference: <span className="font-mono text-slate-400">{inv.id}</span>
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <CurrencyDisplay price={inv.amount} size="sm" />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Download PDF</Button>
                </div>
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
                href={`/dashboard/invoices?page=${data.page - 1}${currentPaymentStatus ? `&paymentStatus=${currentPaymentStatus}` : ''}`}
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
                href={`/dashboard/invoices?page=${data.page + 1}${currentPaymentStatus ? `&paymentStatus=${currentPaymentStatus}` : ''}`}
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

