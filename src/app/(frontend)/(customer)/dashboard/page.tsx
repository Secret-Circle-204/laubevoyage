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

export default async function Page() {
  const data = await CustomerPortalLoader.loadOverview(1)
  return <DashboardOverviewPage data={data} />
}
