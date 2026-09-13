import React from 'react'
import type { Metadata } from 'next'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { ProfileFormClient } from './ProfileFormClient'
import { CustomerProfileLoader } from '@/application/customer/loaders'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profile & Companions | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const initialData = await CustomerProfileLoader.load(session.customerId)

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-hornbill font-light text-foreground">Profile & Companion Travelers</h1>

      <ProfileFormClient initialData={initialData} />
    </div>
  )
}

