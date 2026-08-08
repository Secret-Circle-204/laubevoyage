import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getDomainServices } from '@/domains/factory'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale })

  const [title, description] = await localization.translateBatch([
    "Terms of Service | L'Aube Voyage",
    "Terms and conditions for L'Aube Voyage luxury travel bookings, cancellation policies, and customer loyalty rewards."
  ], ctx)

  return {
    title,
    description,
  }
}

export default async function TermsPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale })

  const rawTexts = [
    "Terms of Service", // 0
    "Last Updated: July 23, 2026", // 1
    "1. Booking Contract & Pricing Snapshot", // 2
    "When a booking is confirmed, a historical Pricing Snapshot (in base EGP and your selected currency) is frozen. Subsequent exchange rate changes or catalog updates will not alter the confirmed price of your reservation.", // 3
    "2. Cancellation & Refunds", // 4
    "Cancellations made 14 days prior to departure receive a full refund. Redeemed loyalty points are automatically credited back to your point ledger upon cancellation." // 5
  ]

  const t = await localization.translateBatch(rawTexts, ctx)

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t[0]}
        </h1>
        <p className="text-xs text-slate-400 font-mono">{t[1]}</p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t[2]}</h2>
            <p>{t[3]}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t[4]}</h2>
            <p>{t[5]}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
