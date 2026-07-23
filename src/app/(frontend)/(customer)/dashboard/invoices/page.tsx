import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Invoices & Receipts | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const invoices: any[] = []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Invoices & Tax Receipts</h1>
      {invoices.length === 0 ? (
        <Card variant="flat" padding="lg" className="text-center py-12">
          <p className="text-slate-500 font-medium">No invoices or tax receipts issued yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {invoices.map((inv) => (
            <Card key={inv.id} variant="flat" padding="md" className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-[#00aeef]">{inv.id}</span>
                  <Badge variant="success" size="sm">{inv.status}</Badge>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{inv.title}</h3>
                <span className="text-xs text-slate-500">📅 {inv.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <CurrencyDisplay amountEGP={inv.amount} size="sm" />
                <Button variant="outline" size="sm">Download PDF</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
