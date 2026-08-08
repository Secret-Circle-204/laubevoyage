import React from 'react'
import type { Metadata } from 'next'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { ProfileFormClient } from './ProfileFormClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profile & Companions | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const { customer } = await getDomainServices()
  const customerDoc = await customer.getById(session.customerId)

  const initialData = {
    firstName: customerDoc.firstName || '',
    lastName: customerDoc.lastName || '',
    email: customerDoc.email || '',
    phone: customerDoc.phone,
    passportNumber: customerDoc.passportNumber,
    nationality: customerDoc.nationality,
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Profile & Companion Travelers</h1>

      <ProfileFormClient initialData={initialData} />
    </div>
  )
}
