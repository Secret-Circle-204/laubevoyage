'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui'
import type { CustomerPortalOverviewDTO } from '@/application/dashboard/dto'

export function CustomerSidebar({ data }: { data: CustomerPortalOverviewDTO }) {
  const pathname = usePathname()

  const links = [
    { label: 'Overview', href: '/dashboard', icon: '📊' },
    { label: 'My Bookings', href: '/dashboard/bookings', icon: '🧳' },
    { label: 'Loyalty Rewards', href: '/dashboard/loyalty', icon: '👑' },
    { label: 'Profile & Companions', href: '/dashboard/profile', icon: '👤' },
    { label: 'Invoices & Receipts', href: '/dashboard/invoices', icon: '🧾' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  ]

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      {/* Customer Profile Card */}
      <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-full bg-[#2e3192] text-white flex items-center justify-center font-bold text-lg">
          {data.fullName.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900 dark:text-white">{data.fullName}</span>
          <Badge variant="accent" size="sm" className="w-fit mt-1 uppercase text-[10px]">
            {data.tier} Tier
          </Badge>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 mt-6">
        {links.map((link) => {
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-[#2e3192] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
