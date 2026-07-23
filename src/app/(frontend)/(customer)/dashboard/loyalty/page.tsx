import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Loyalty Rewards & Tier | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const data = await CustomerPortalLoader.loadOverview(1)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Loyalty Rewards</h1>
        <Badge variant="accent" className="uppercase font-bold">{data.tier} Tier Member</Badge>
      </div>

      <Card variant="elevated" padding="lg" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Available Loyalty Balance</span>
            <span className="text-4xl font-extrabold text-[#f58220]">{data.points.toLocaleString()} Points</span>
          </div>
          <Badge variant="primary" size="md">100 Pts = 100 EGP</Badge>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Explorer (0 pts)</span>
            <span>Voyager (1,000 pts)</span>
            <span>Elite (5,000 pts)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2e3192] to-[#00aeef] transition-all duration-500"
              style={{ width: `${data.nextTierProgressPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 text-right font-medium">
            350 more points to reach ELITE Tier
          </span>
        </div>
      </Card>
    </div>
  )
}
