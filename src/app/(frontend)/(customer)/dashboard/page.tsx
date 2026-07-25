import React from 'react'
import type { Metadata } from 'next'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { DashboardOverviewPage } from '@/components/features/dashboard/DashboardOverviewPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Customer Dashboard Overview | L'Aube Voyage",
    description: 'Manage your active bookings, loyalty points, and profile.',
  }
}

import { redirect } from 'next/navigation'
import { SessionResolver } from '@/application/auth/session-resolver'

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const data = await CustomerPortalLoader.loadOverview(session.customerId)
  return <DashboardOverviewPage data={data} />
}
