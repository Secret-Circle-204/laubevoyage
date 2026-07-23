import React from 'react'
import type { Metadata } from 'next'
import { Card, Badge, Input, Button } from '@/components/ui'

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
          <Card variant="flat" padding="lg" className="lg:col-span-2">
            <form action="/api/contact" method="POST" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Name
                  </label>
                  <Input name="name" placeholder="John Doe" required className="bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <Input type="email" name="email" placeholder="john@example.com" required className="bg-white dark:bg-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Subject / Desired Destination
                </label>
                <Input name="subject" placeholder="Custom 5-Day Cairo & Luxor Trip" required className="bg-white dark:bg-slate-900" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Message Details
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  placeholder="Tell us about your travel dates, number of guests, and special requests..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#00aeef] focus:outline-none"
                />
              </div>

              <Button variant="primary" type="submit" size="lg" className="w-full">
                Send Concierge Message →
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
