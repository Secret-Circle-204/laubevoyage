import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Loyalty Rewards & Tier | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const { loyalty, localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale, cookieCurrency: currency })

  const [data, history] = await Promise.all([
    CustomerPortalLoader.loadOverview(session.customerId, { locale, currency }),
    loyalty.getCustomerLedgerHistory(session.customerId, 50),
  ])

  const translatedCurrentTier = localization.translateUiKey(`loyalty.tier.${data.currentTier}`, ctx)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Loyalty Rewards</h1>
        <Badge variant="accent" className="uppercase font-bold">{translatedCurrentTier} Tier Member</Badge>
      </div>

      <Card variant="elevated" padding="lg" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Available Loyalty Balance</span>
            <span className="text-4xl font-extrabold text-[#f58220]">{data.formattedPoints} Points</span>
          </div>
          <Badge variant="primary" size="md">
            {data.redemptionRate.pointsUnit} Pts = {data.redemptionRate.displayValue}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            {data.tierThresholds.map((threshold) => {
              const tierName = localization.translateUiKey(`loyalty.tier.${threshold.tier}`, ctx)
              return (
                <span key={threshold.tier}>
                  {tierName} ({threshold.formattedMinSpent})
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
            {data.remainingQualifyingSpendEGP !== null && data.remainingQualifyingSpendEGP > 0
              ? localization
                  .translateUiKey('loyalty.progress.remainingToTier', ctx)
                  .replace('{amount}', data.formattedRemainingQualifyingSpend || '')
                  .replace('{tier}', data.nextTierName)
              : localization.translateUiKey('loyalty.progress.maxTier', ctx)}
          </span>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Points Transaction History</h2>
        
        {history.length === 0 ? (
          <Card variant="flat" padding="lg" className="text-center text-slate-500 py-12">
            No loyalty transactions found yet. Earn points by booking experiences!
          </Card>
        ) : (
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Transaction Reference</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((record) => {
                    const formattedDate = new Date(record.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    const isPositive = record.points > 0
                    
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
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isPositive ? `+${record.points}` : record.points} Pts
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
