import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge, CurrencyDisplay, Button } from '@/components/ui'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { redirect } from 'next/navigation'
import { getLocaleContext } from '@/lib/get-locale-context'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Invoices & Receipts | L'Aube Voyage Customer Portal" }
}

export default async function Page() {
  const session = await SessionResolver.resolve()
  if (!session.isAuthenticated || !session.customerId) {
    redirect('/login')
  }

  const { booking, payment, experience, localization } = await getDomainServices()

  const localeCtx = await getLocaleContext()
  const ctx = localeCtx

  // 1. Get user bookings
  const bookingsResult = await booking.getUserBookings(session.customerId, 1, 100)

  // 2. Fetch associated payment transactions and experiences concurrently
  const invoiceItems = await Promise.all(
    (bookingsResult.data || []).map(async (b) => {
      const [tx, exp] = await Promise.all([
        payment.getByBookingId(b.id).catch(() => null),
        experience.getById(b.experienceId).catch(() => null),
      ])

      if (!tx) return null

      // Fetch details from the transaction attempts
      const attempt = tx.attempts?.[0]
      const txCurrency = attempt?.currency || 'EGP'
      const displayAmount = attempt?.amount || 0

      const basePriceEGP = b.pricingSnapshot?.totalAmountEGP || b.pricingSnapshot?.subtotalEGP || 0
      const exchangeRate = b.pricingSnapshot?.exchangeRate || 1

      const formattedAmount = await localization.formatAlreadyConvertedPrice(
        displayAmount,
        basePriceEGP,
        txCurrency,
        exchangeRate,
        ctx
      )

      return {
        id: tx.transactionId,
        bookingNumber: b.bookingNumber,
        status: tx.status,
        title: exp?.title || `Trip #${b.bookingNumber}`,
        date: new Date(tx.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        amount: formattedAmount,
      }
    })
  )

  const invoices = invoiceItems.filter((item): item is NonNullable<typeof item> => item !== null)

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
            <Card key={inv.id} variant="flat" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-[#00aeef]">{inv.id}</span>
                  <Badge variant={inv.status === 'successful' ? 'success' : 'warning'} size="sm">
                    {inv.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{inv.title}</h3>
                <span className="text-xs text-slate-500">📅 {inv.date} • Booking Reference: <span className="font-mono">{inv.bookingNumber}</span></span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <CurrencyDisplay price={inv.amount} size="sm" />
                <Button variant="outline" size="sm">Download PDF</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
