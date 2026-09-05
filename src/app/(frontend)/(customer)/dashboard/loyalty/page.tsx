import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Loyalty Rewards & Tier | L'Aube Voyage Customer Portal" }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.uiLabels.pageTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{data.uiLabels.pageSubtitle}</p>
        </div>
        <Badge variant="accent" className="uppercase font-bold text-xs">{data.translatedCurrentTier} {data.uiLabels.tierMemberSuffix}</Badge>
      </div>

      {/* Main Loyalty Balance Card */}
      <Card variant="elevated" padding="lg" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">{data.uiLabels.availableBalance}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#f58220]">{data.formattedAvailablePoints}</span>
              <span className="text-lg font-bold text-[#f58220]">{data.uiLabels.pointsUnit}</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
              {data.uiLabels.cashValuePrefix} {data.pointsMonetaryValue.formatted} {data.uiLabels.cashValueSuffix}
            </span>
            {data.heldPoints > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block mt-1">
                {data.uiLabels.heldPointsNotice}
              </span>
            )}
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">{data.uiLabels.totalQualifyingSpend}</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{data.formattedTotalSpentEGP}</span>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            {data.tierThresholds.map((threshold) => {
              return (
                <span key={threshold.tier}>
                  {threshold.translatedTierName} ({threshold.formattedMinSpent})
                </span>
              )
            })}
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2e3192] to-[#00aeef] transition-all duration-500"
              style={{ width: `${data.nextTierProgressPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 text-right font-medium">
            {data.progressText}
          </span>
        </div>
      </Card>

      {/* Points Value Guide Card */}
      <Card variant="flat" padding="lg" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-br from-white via-slate-50 to-slate-100/50 dark:from-[#1a1718] dark:via-[#1f1a1c] dark:to-[#161415] border border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {data.pointsValueGuide.title}
            </h2>
            <Badge variant="accent" size="sm">{data.uiLabels.instantCheckoutDiscount}</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {data.pointsValueGuide.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
          <Badge variant="accent" size="md" className="py-2.5 px-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider block">{data.uiLabels.officialRate}</span>
            <span className="text-sm font-bold">
              {data.pointsValueGuide.unitText}
            </span>
          </Badge>

          <Badge variant="success" size="md" className="py-2.5 px-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider block">{data.uiLabels.yourPointsValue}</span>
            <span className="text-sm font-extrabold">
              {data.pointsMonetaryValue.formatted}
            </span>
          </Badge>
        </div>
      </Card>

      {/* Points History Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data.uiLabels.transactionHistoryTitle}</h2>
        
        {data.history.length === 0 ? (
          <Card variant="flat" padding="lg" className="text-center text-slate-500 py-12">
            {data.uiLabels.noTransactions}
          </Card>
        ) : (
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">{data.uiLabels.dateCol}</th>
                    <th className="px-6 py-4">{data.uiLabels.referenceCol}</th>
                    <th className="px-6 py-4">{data.uiLabels.typeCol}</th>
                    <th className="px-6 py-4">{data.uiLabels.reasonCol}</th>
                    <th className="px-6 py-4 text-right">{data.uiLabels.pointsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.history.map((record) => {
                    const formattedDate = new Date(record.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {record.id}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            record.type === 'earned' || record.type === 'welcome_bonus' || record.type === 'tier_bonus'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : record.type === 'redeem' || record.type === 'redeemed'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                          }`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {record.reason}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${
                          record.isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {record.isPositive ? `+${record.points}` : record.points} {data.uiLabels.pointsUnit}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Server-Side Pagination Bar */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                <span className="text-xs text-slate-500">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalDocs} total records)
                </span>
                <div className="flex items-center gap-2">
                  {data.pagination.hasPrevPage ? (
                    <Link
                      href={`/dashboard/loyalty?page=${data.pagination.page - 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                      Previous
                    </span>
                  )}
                  {data.pagination.hasNextPage ? (
                    <Link
                      href={`/dashboard/loyalty?page=${data.pagination.page + 1}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed">
                      Next
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

