import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, Badge, EmptyState } from '@/components/ui'
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

function LuggageIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.25v-2.625a3.375 3.375 0 00-3.375-3.375H7.125a3.375 3.375 0 00-3.375 3.375v2.625m16.5 0A2.25 2.25 0 0118 16.5H6a2.25 2.25 0 01-2.25-2.25m16.5 0v3.75m-16.5-3.75v3.75M9 8.25V5.625a2.25 2.25 0 012.25-2.25h3.5a2.25 2.25 0 012.25 2.25V8.25" />
    </svg>
  )
}

function CreditCardIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6 3.75h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 5.25v13.5a1.5 1.5 0 001.5 1.5z" />
    </svg>
  )
}

function CrownIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 9v8.25a2.25 2.25 0 01-2.25 2.25m-16.5 0l3-7.5 4.5 4.5 4.5-4.5 3 7.5" />
    </svg>
  )
}

function MegaphoneIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.213m3.102 0a41.44 41.44 0 005.294 2.705c.372.15.792-.01 1.011-.357.218-.348.188-.8-.073-1.121a37.525 37.525 0 00-6.232-5.727m0 0a37.54 37.54 0 016.232-5.727c.261-.321.291-.773.073-1.121-.219-.347-.639-.508-1.011-.357a41.44 41.44 0 00-5.294 2.705m0 4.5c.334.334.667.668 1 1" />
    </svg>
  )
}

const categoryTabs = [
  { label: 'All Notifications', value: undefined, icon: null },
  { label: 'Bookings', value: 'booking', icon: LuggageIcon },
  { label: 'Payments', value: 'payment', icon: CreditCardIcon },
  { label: 'Loyalty Rewards', value: 'loyalty', icon: CrownIcon },
  { label: 'Account & Offers', value: 'marketing', icon: MegaphoneIcon },
]

const getCategoryBadge = (cat: string) => {
  switch (cat) {
    case 'booking':
      return { label: 'Booking', icon: LuggageIcon }
    case 'payment':
      return { label: 'Payment', icon: CreditCardIcon }
    case 'loyalty':
      return { label: 'Loyalty', icon: CrownIcon }
    case 'marketing':
      return { label: 'Account', icon: MegaphoneIcon }
    default:
      return { label: 'Notice', icon: null }
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

      {/* Notifications List */}
      {data.notifications.length === 0 ? (
        <EmptyState
          title="No notifications found"
          description={
            currentCategory
              ? `There are no notifications matching category "${currentCategory}".`
              : 'You have no notifications yet.'
          }
          icon="notification"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {data.notifications.map((n) => {
            const badge = getCategoryBadge(n.category)
            const BadgeIcon = badge.icon
            return (
              <Card key={n.id} variant="flat" padding="md" className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm text-foreground">{n.title}</h3>
                    {n.unread && <Badge variant="accent" size="sm">NEW</Badge>}
                    <Badge variant="accent" size="sm" className="text-[10px] inline-flex items-center gap-1">
                      {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                      <span>{badge.label}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.text}</p>
                </div>
                <span className="text-xs text-muted-foreground/70 flex-shrink-0 ml-4 font-medium">{n.time}</span>
              </Card>
            )
          })}
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
