'use client'

import React from 'react'
import Link from 'next/link'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import type { CustomerPortalOverviewDTO } from '@/application/dashboard/dto'

export function DashboardOverviewPage({ data }: { data: CustomerPortalOverviewDTO }) {
  return (
    <div className="flex flex-col gap-8 flex-grow">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card variant="flat" padding="md" className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Active Bookings</span>
          <span className="text-3xl font-extrabold text-[#2e3192] dark:text-[#00aeef]">
            {data.activeBookingsCount}
          </span>
        </Card>

        <Card variant="flat" padding="md" className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Loyalty Points</span>
          <span className="text-3xl font-extrabold text-[#f58220]">
            {data.points.toLocaleString()} pts
          </span>
        </Card>

        <Card variant="flat" padding="md" className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Member Tier</span>
          <span className="text-2xl font-extrabold capitalize text-emerald-600">
            {data.tier} Member
          </span>
        </Card>
      </div>

      {/* Recent Bookings Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Reservations</h2>
          <Link href="/dashboard/bookings">
            <Button variant="ghost" size="sm">
              View All →
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {data.recentBookings.map((booking) => (
            <Card key={booking.id} variant="flat" padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${booking.experienceImage})` }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#00aeef]">{booking.reference}</span>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'} size="sm">
                      {booking.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{booking.experienceTitle}</h3>
                  <span className="text-xs text-slate-500">📅 {booking.departureDate} • {booking.passengersCount} Passengers</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <CurrencyDisplay amountEGP={booking.totalCost.amountEGP} size="sm" />
                <Link href={`/dashboard/bookings/${booking.id}`}>
                  <Button variant="outline" size="sm" className="mt-1">
                    Voucher PDF
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
