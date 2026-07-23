import React from 'react'
import type { Metadata } from 'next'
import { Card, Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Customer Preferences & Settings | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Settings & Security</h1>
      <Card variant="flat" padding="lg" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Preferences</h2>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#00aeef]" />
            <span>Receive booking status updates via WhatsApp</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#00aeef]" />
            <span>Email newsletters & exclusive travel deals</span>
          </label>
        </div>
        <Button variant="primary" size="sm" className="w-fit mt-2">
          Save Settings
        </Button>
      </Card>
    </div>
  )
}
