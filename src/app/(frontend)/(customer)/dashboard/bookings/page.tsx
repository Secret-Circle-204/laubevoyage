import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, EmptyState } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { getLocaleContext } from '@/lib/get-locale-context'
import { redirect } from 'next/navigation'
import { SessionResolver } from '@/application/auth/session-resolver'
import { TravelLedgerCard } from '@/components/features/dashboard/TravelLedgerCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Travel Ledger & Bookings | L'Aube Voyage Customer Portal" }
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
    { label: 'All', value: undefined },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Pending Payment', value: 'pending_payment' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Luxury Ledger Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase text-secondary font-semibold">
              VOYAGE ARCHIVE & REPOSITORY
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-hornbill font-light text-foreground">
            Travel Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review, track, and inspect all your curated voyages and sovereign travel reservations.
          </p>
        </div>
        <Badge
          variant="secondary"
          size="md"
          className="text-xs border border-secondary/25 bg-secondary/10 text-secondary self-start sm:self-auto font-semibold"
        >
          {data.total} {data.total === 1 ? 'Total Voyage' : 'Total Voyages'}
        </Badge>
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
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-card-elevated hover:text-foreground border border-border/80'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Bookings Ledger List */}
      {data.bookings.length === 0 ? (
        <EmptyState
          title="No voyages found"
          description={
            currentStatus
              ? `There are no travel records matching status "${currentStatus.replace(/_/g, ' ')}".`
              : 'You have not booked any voyages yet. Explore our curated journeys to begin.'
          }
          icon="booking"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {data.bookings.map((booking) => (
            <TravelLedgerCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {/* Server-Side Pagination Bar */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <span className="text-xs font-medium text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total records)
          </span>

          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Link
                href={`/dashboard/bookings?page=${data.page - 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-foreground hover:bg-card-elevated transition-colors"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card/40 border border-border/40 text-muted-foreground/40 cursor-not-allowed">
                ← Previous
              </span>
            )}

            {data.page < data.totalPages ? (
              <Link
                href={`/dashboard/bookings?page=${data.page + 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-foreground hover:bg-card-elevated transition-colors"
              >
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card/40 border border-border/40 text-muted-foreground/40 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

