import React from 'react'
import type { Metadata } from 'next'
import { Card, Input, Button } from '@/components/ui'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'

import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profile & Companions | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const data = await CustomerPortalLoader.loadOverview(session.customerId)

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Profile & Companion Travelers</h1>

      <Card variant="flat" padding="lg" className="flex flex-col gap-6">
        <h2 className="text-xl font-bold">Personal Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" defaultValue={data.fullName} placeholder="Enter your full name" />
          <Input label="Email Address" defaultValue={data.email} readOnly />
          <Input label="Passport Number" placeholder="e.g. A1234567" />
          <Input label="Nationality" placeholder="e.g. Egyptian" />
        </div>
        <Button variant="primary" size="md" className="w-fit">
          Save Profile Details
        </Button>
      </Card>
    </div>
  )
}
