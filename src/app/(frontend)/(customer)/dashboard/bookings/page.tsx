import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My Bookings History | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const data = await CustomerPortalLoader.loadOverview(1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Bookings History</h1>
        <Badge variant="primary">{data.recentBookings.length} Total Bookings</Badge>
      </div>

      <div className="flex flex-col gap-4">
        {data.recentBookings.map((booking) => (
          <Card key={booking.id} variant="flat" padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${booking.experienceImage})` }}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-[#00aeef]">{booking.reference}</span>
                  <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'} size="sm">
                    {booking.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{booking.experienceTitle}</h3>
                <span className="text-xs text-slate-500">📅 {booking.departureDate} • {booking.passengersCount} Passengers</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <CurrencyDisplay amountEGP={booking.totalCost.amountEGP} size="md" />
              <Button variant="accent" size="sm" className="mt-2">
                Download Voucher PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
