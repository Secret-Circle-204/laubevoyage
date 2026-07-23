import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy Policy | L'Aube Voyage",
  description: "L'Aube Voyage privacy policy detailing data collection, processing security, customer rights, and booking data protection.",
}

export default function PrivacyPage() {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400 font-mono">Last Updated: July 23, 2026</p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Data Collection & Usage</h2>
            <p>
              L&apos;Aube Voyage collects personal information strictly necessary for creating travel reservations, verifying identity, processing secure payments, and maintaining loyalty point ledgers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Payment & Financial Data Protection</h2>
            <p>
              We do not store complete credit card or payment authorization credentials on our servers. Financial transactions are securely handled by PCI-DSS compliant providers (Stripe & Paymob).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Separation of Customer Data</h2>
            <p>
              Customer accounts remain isolated within our dedicated database collections. Administrative staff accounts operate in separate domains without access to private traveler preferences or point transactions without explicit permission.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
