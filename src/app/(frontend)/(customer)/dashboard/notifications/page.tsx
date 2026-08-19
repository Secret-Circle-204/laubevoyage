import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import { SessionResolver } from '@/application/auth/session-resolver'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Notifications Hub | L'Aube Voyage Customer Portal" }
}

interface PageProps {
  searchParams?: Promise<{
    page?: string
    category?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const sp = searchParams ? await searchParams : {}
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const currentCategory = sp.category?.toLowerCase()

  const data = await CustomerPortalLoader.loadNotifications(session.customerId, {
    page: currentPage,
    limit: 20,
    category: currentCategory,
  })

  const categoryTabs = [
    { label: 'All Notifications', value: undefined },
    { label: 'Bookings', value: 'booking', icon: '🧳' },
    { label: 'Payments', value: 'payment', icon: '💳' },
    { label: 'Loyalty Rewards', value: 'loyalty', icon: '👑' },
    { label: 'Account & Offers', value: 'marketing', icon: '📢' },
  ]

  const getCategoryBadgeLabel = (cat: string) => {
    switch (cat) {
      case 'booking':
        return '🧳 Booking'
      case 'payment':
        return '💳 Payment'
      case 'loyalty':
        return '👑 Loyalty'
      case 'marketing':
        return '📢 Account'
      default:
        return 'Notice'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Notifications Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review your booking confirmations, payment receipts, loyalty updates, and account notices.
          </p>
        </div>
        <Badge variant="primary" size="md">{data.total} Total Notifications</Badge>
      </div>

      {/* Server-Side Database Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoryTabs.map((tab) => {
          const isActive = currentCategory === tab.value || (!currentCategory && !tab.value)
          const href = tab.value ? `/dashboard/notifications?category=${tab.value}` : '/dashboard/notifications'

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

      {/* Notifications List */}
      {data.notifications.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <span className="text-4xl mb-3 block">🔔</span>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No notifications found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {currentCategory ? `There are no notifications matching category "${currentCategory}".` : 'You have no notifications yet.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.notifications.map((n) => (
            <Card key={n.id} variant="flat" padding="md" className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</h3>
                  {n.unread && <Badge variant="accent" size="sm">NEW</Badge>}
                  <Badge variant="accent" size="sm" className="text-[10px]">
                    {getCategoryBadgeLabel(n.category)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{n.text}</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{n.time}</span>
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
                href={`/dashboard/notifications?page=${data.page - 1}${currentCategory ? `&category=${currentCategory}` : ''}`}
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
                href={`/dashboard/notifications?page=${data.page + 1}${currentCategory ? `&category=${currentCategory}` : ''}`}
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
