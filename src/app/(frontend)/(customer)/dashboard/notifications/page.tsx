import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Notifications Hub | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const notifications: any[] = []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Notifications Hub</h1>
      {notifications.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <p className="text-slate-500 font-medium">You have no unread or recent notifications.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((n) => (
            <Card key={n.id} variant="flat" padding="md" className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</h3>
                  {n.unread && <Badge variant="accent" size="sm">NEW</Badge>}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{n.text}</p>
              </div>
              <span className="text-xs text-slate-400">{n.time}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
