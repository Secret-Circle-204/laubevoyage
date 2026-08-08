import React from 'react'
import type { Metadata } from 'next'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { SettingsFormClient } from './SettingsFormClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Customer Preferences & Settings | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const { customer } = await getDomainServices()
  const customerDoc = await customer.getById(session.customerId)

  const initialData = customerDoc.notifications || {
    email: true,
    sms: false,
    push: true,
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Settings & Security</h1>
      <SettingsFormClient initialData={initialData} />
    </div>
  )
}
