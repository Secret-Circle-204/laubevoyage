import React from 'react'
import type { Metadata } from 'next'
import { Badge, EmptyState } from '@/components/ui'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'
import { LoyaltyPassCard } from '@/components/features/dashboard/LoyaltyPassCard'
import { LoyaltyLedgerRow } from '@/components/features/dashboard/LoyaltyLedgerRow'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Loyalty Rewards & Privileges | L'Aube Voyage Customer Portal" }
}

export default async function Page(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams
  const currentPage = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1)

  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const data = await CustomerLoyaltyLoader.load(session.customerId, { page: currentPage, limit: 20 })

  return (
    <div className="flex flex-col gap-8">
      {/* Sovereign Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase text-secondary font-semibold">
              SOVEREIGN PRIVILEGES AND REWARDS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-hornbill font-light text-foreground">
            {data.uiLabels.pageTitle}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data.uiLabels.pageSubtitle}
          </p>
        </div>

        <Badge
          variant="secondary"
          size="md"
          className="text-xs border border-secondary/25 bg-secondary/10 text-secondary self-start sm:self-auto uppercase font-semibold"
        >
          {data.formattedMemberTier || `${data.translatedCurrentTier} ${data.uiLabels.tierMemberSuffix}`}
        </Badge>
      </div>

      {/* Member Loyalty Pass & Elevation (Master Balance + Progressive Disclosure) */}
      <LoyaltyPassCard data={data} />

      {/* Loyalty Activity Ledger Section */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/70">
          <div>
            <h2 className="text-xl sm:text-2xl font-hornbill font-light text-foreground">
              {data.uiLabels.transactionHistoryTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Authoritative, immutable audit record of all earned rewards and redeemed checkout credits.
            </p>
          </div>
          {data.pagination && (
            <Badge variant="outline" size="sm" className="text-xs text-muted-foreground font-medium shrink-0">
              {data.pagination.totalDocs} {data.pagination.totalDocs === 1 ? 'Record' : 'Records'}
            </Badge>
          )}
        </div>

        {data.history.length === 0 ? (
          <EmptyState
            title="No loyalty transactions"
            description={data.uiLabels.noTransactions}
            icon="booking"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {data.history.map((record) => (
              <LoyaltyLedgerRow
                key={record.id}
                record={record}
                pointsUnit={data.uiLabels.pointsUnit}
              />
            ))}
          </div>
        )}

        {/* Authoritative Server-Side Pagination Bar with Clear Boundary */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t-2 border-border/80">
            <div className="text-xs font-medium text-muted-foreground text-center sm:text-left">
              Showing <strong className="text-foreground">{(data.pagination.page - 1) * data.pagination.limit + 1}</strong>–
              <strong className="text-foreground">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalDocs)}</strong> of{' '}
              <strong className="text-foreground">{data.pagination.totalDocs}</strong> total records • Page{' '}
              <strong className="text-foreground">{data.pagination.page}</strong> of{' '}
              <strong className="text-foreground">{data.pagination.totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              {data.pagination.hasPrevPage ? (
                <Link
                  href={`/dashboard/loyalty?page=${data.pagination.page - 1}`}
                  aria-label="Previous Page"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:border-accent/40 hover:text-accent transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 border border-border/40 text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5 opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>Previous</span>
                </span>
              )}

              <span className="text-xs font-hornbill px-2 text-foreground font-medium">
                {data.pagination.page} / {data.pagination.totalPages}
              </span>

              {data.pagination.hasNextPage ? (
                <Link
                  href={`/dashboard/loyalty?page=${data.pagination.page + 1}`}
                  aria-label="Next Page"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:border-accent/40 hover:text-accent transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Next</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 border border-border/40 text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5 opacity-50">
                  <span>Next</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


