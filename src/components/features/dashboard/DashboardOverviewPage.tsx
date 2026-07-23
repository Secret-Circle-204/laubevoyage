'use client'

import React from 'react'
import Link from 'next/link'
import { useTheme } from '@/providers/theme-provider'
import { Card, Badge, CurrencyDisplay, EmptyState } from '@/components/ui'
import type { CustomerPortalOverviewDTO } from '@/application/dashboard/dto'

export function DashboardOverviewPage({ data }: { data: CustomerPortalOverviewDTO }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col gap-8 flex-grow">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`p-6 rounded-2xl border flex flex-col gap-2 ${isDark ? 'bg-[#1a1718] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Bookings</span>
          <span className="text-4xl font-serif font-light text-[#00aeef]">
            {data.activeBookingsCount}
          </span>
        </div>

        <div className={`p-6 rounded-2xl border flex flex-col gap-2 ${isDark ? 'bg-[#1a1718] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loyalty Points</span>
          <span className="text-4xl font-serif font-light text-[#f58220]">
            {data.points.toLocaleString()} pts
          </span>
        </div>

        <div className={`p-6 rounded-2xl border flex flex-col gap-2 ${isDark ? 'bg-[#1a1718] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member Tier</span>
          <span className="text-3xl font-serif font-light capitalize text-emerald-500">
            {data.tier} Member
          </span>
        </div>
      </div>

      {/* Recent Bookings Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className={`text-2xl font-serif font-light ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
              Recent Reservations
            </h2>
            <div className="h-1 w-12 bg-[#f58220] mt-1" />
          </div>

          <Link href="/dashboard/bookings">
            <button
              className={`px-4 py-2 text-xs tracking-widest uppercase font-medium border rounded-lg transition-colors ${
                isDark
                  ? 'border-white/10 text-slate-300 hover:border-[#00aeef]'
                  : 'border-slate-300 text-slate-700 hover:border-[#2e3192]'
              }`}
            >
              View All →
            </button>
          </Link>
        </div>

        {data.recentBookings.length === 0 ? (
          <EmptyState
            title="No Bookings Found"
            description="You don't have any recent trip reservations. Start planning your luxury journey with us today."
            icon="booking"
            actionLabel="Explore Experiences"
            actionHref="/experiences"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {data.recentBookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 hover:border-[#00aeef]/40 ${
                  isDark ? 'bg-[#1a1718] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0 shadow-md"
                    style={{ backgroundImage: `url(${booking.experienceImage})` }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#00aeef]">{booking.reference}</span>
                      <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'} size="sm">
                        {booking.status.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className={`font-serif font-light text-base ${isDark ? 'text-white' : 'text-[#231F20]'}`}>
                      {booking.experienceTitle}
                    </h3>
                    <span className="text-xs text-slate-400">📅 {booking.departureDate} • {booking.passengersCount} Passengers</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <CurrencyDisplay amountEGP={booking.totalCost.amountEGP} size="sm" />
                  <Link href={`/dashboard/bookings/${booking.id}`}>
                    <button className="mt-2 px-4 py-1.5 text-xs uppercase tracking-wider font-semibold border border-[#00aeef]/40 text-[#00aeef] hover:bg-[#00aeef] hover:text-white rounded-lg transition-colors">
                      Voucher PDF
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
