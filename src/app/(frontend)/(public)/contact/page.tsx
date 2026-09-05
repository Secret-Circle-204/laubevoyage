import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'
import { ContactFormClient } from './ContactFormClient'
import { getLocaleContext } from '@/lib/get-locale-context'
import { getDomainServices } from '@/domains/factory'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact Us & VIP Concierge | L'Aube Voyage",
    description: "Get in touch with L'Aube Voyage luxury travel concierges to customize your itinerary or request private tour arrangements.",
  }
}

export default async function ContactPage() {
  const ctx = await getLocaleContext()
  const { localization } = await getDomainServices()

  const badge = localization.translateUiKey('contact.vipConciergeBadge', ctx)
  const title = localization.translateUiKey('contact.title', ctx)
  const description = localization.translateUiKey('contact.description', ctx)
  const directContact = localization.translateUiKey('contact.directContact', ctx)
  const cairoHeadOffice = localization.translateUiKey('contact.cairoHeadOffice', ctx)
  const vipHotline = localization.translateUiKey('contact.vipHotline', ctx)
  const emailLabel = localization.translateUiKey('contact.emailLabel', ctx)

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-3">
            {badge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Contact Details Card */}
          <Card variant="flat" padding="lg" className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{directContact}</h3>

            <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{cairoHeadOffice}:</strong>
                  15 Corniche El Nile, Garden City, Cairo, Egypt
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📞</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{vipHotline}:</strong>
                  +20 2 2790 0000 / +20 100 000 0000
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">✉️</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{emailLabel}:</strong>
                  concierge@laubevoyage.com
                </div>
              </div>
            </div>
          </Card>

          {/* Form Card */}
          <div className="lg:col-span-2">
            <ContactFormClient />
          </div>
        </div>
      </div>
    </div>
  )
}
