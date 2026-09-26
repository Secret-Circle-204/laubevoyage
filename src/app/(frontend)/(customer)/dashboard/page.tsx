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
import { getLocaleContext } from '@/lib/get-locale-context'

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.customerId) {
    redirect('/login')
  }

  const localeCtx = await getLocaleContext()
  const data = await CustomerPortalLoader.loadOverview(session.customerId, {
    locale: localeCtx.language,
    currency: localeCtx.currency,
  })
  return <DashboardOverviewPage data={data} />
}
