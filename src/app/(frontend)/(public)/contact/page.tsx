import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge } from '@/components/ui'
import { ContactFormClient } from './ContactFormClient'

export const metadata: Metadata = {
  title: "Contact Us & VIP Concierge | L'Aube Voyage",
  description: "Get in touch with L'Aube Voyage luxury travel concierges to customize your itinerary or request private tour arrangements.",
}

export default function ContactPage() {
  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-3">
            24/7 VIP Concierge
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Contact Our Travel Specialists
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
            Have questions about custom itineraries, group bookings, or private Nile cruise charters? Send us a message and our team will get back to you within 2 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Contact Details Card */}
          <Card variant="flat" padding="lg" className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Direct Contact</h3>

            <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Cairo Head Office:</strong>
                  15 Corniche El Nile, Garden City, Cairo, Egypt
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📞</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">VIP Hotline:</strong>
                  +20 2 2790 0000 / +20 100 000 0000
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">✉️</span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Email:</strong>
                  concierge@laubevoyage.com
                </div>
              </div>
            </div>
          </Card>

          {/* Form Card */}
          <ContactFormClient />
        </div>
      </div>
    </div>
  )
}
