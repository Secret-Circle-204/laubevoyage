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
    "Privacy Policy | L'Aube Voyage",
    "L'Aube Voyage privacy policy detailing data collection, processing security, customer rights, and booking data protection."
  ], ctx)

  return {
    title,
    description,
  }
}

export default async function PrivacyPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('laube-locale')?.value
  const { localization } = await getDomainServices()
  const ctx = await localization.buildContext({ cookieLocale: locale })

  const rawTexts = [
    "Privacy Policy", // 0
    "Last Updated: July 23, 2026", // 1
    "1. Data Collection & Usage", // 2
    "L'Aube Voyage collects personal information strictly necessary for creating travel reservations, verifying identity, processing secure payments, and maintaining loyalty point ledgers.", // 3
    "2. Payment & Financial Data Protection", // 4
    "We do not store complete credit card or payment authorization credentials on our servers. Financial transactions are securely handled by PCI-DSS compliant providers (Stripe & Paymob).", // 5
    "3. Separation of Customer Data", // 6
    "Customer accounts remain isolated within our dedicated database collections. Administrative staff accounts operate in separate domains without access to private traveler preferences or point transactions without explicit permission." // 7
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

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t[6]}</h2>
            <p>{t[7]}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
