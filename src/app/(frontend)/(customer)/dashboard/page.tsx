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
import { cookies } from 'next/headers'

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const currency = cookieStore.get('laube-currency')?.value

  const data = await CustomerPortalLoader.loadOverview(session.customerId, { locale, currency })
  return <DashboardOverviewPage data={data} />
}
