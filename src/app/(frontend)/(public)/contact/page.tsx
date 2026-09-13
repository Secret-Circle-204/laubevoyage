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

// SVG Icons
function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  )
}

function MailIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
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
    <div className="py-16 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-3">
            {badge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Contact Details Card */}
          <Card variant="flat" padding="lg" className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-foreground">{directContact}</h3>

            <div className="flex flex-col gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <PinIcon className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-foreground">{cairoHeadOffice}:</strong>
                  15 Corniche El Nile, Garden City, Cairo, Egypt
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <PhoneIcon className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-foreground">{vipHotline}:</strong>
                  +20 2 2790 0000 / +20 100 000 0000
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <MailIcon className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-foreground">{emailLabel}:</strong>
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
