import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Terms of Service | L'Aube Voyage",
  description: "Terms and conditions for L'Aube Voyage luxury travel bookings, cancellation policies, and customer loyalty rewards.",
}

export default function TermsPage() {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400 font-mono">Last Updated: July 23, 2026</p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Booking Contract & Pricing Snapshot</h2>
            <p>
              When a booking is confirmed, a historical Pricing Snapshot (in base EGP and your selected currency) is frozen. Subsequent exchange rate changes or catalog updates will not alter the confirmed price of your reservation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Cancellation & Refunds</h2>
            <p>
              Cancellations made 14 days prior to departure receive a full refund. Redeemed loyalty points are automatically credited back to your point ledger upon cancellation.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
