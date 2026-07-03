import 'server-only'
import { getBookingData } from '@/services/booking'
import BookingForm from './BookingForm'
import { AnimatedSection } from '@/components/premium-ui/AnimatedSection'
import { Suspense } from 'react'
import { TravelLoader } from '@/components/premium-ui/TravelLoader'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const metadata = {
  title: "Book Your Journey | L'Aube Voyage",
  description: 'Begin your bespoke journey with our seamless reservation experience.',
}

export default async function BookingPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const { destinations, packages, excursions } = await getBookingData()

  return (
    <main className="min-h-screen bg-background dark:bg-dark pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <span className="text-accent text-sm tracking-[0.3em] uppercase mb-4 block">
            Reservation
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-light mb-6">
            Plan Your <span className="text-secondary">Journey</span>
          </h1>
          <p className="text-gray dark:text-gray/80 max-w-2xl mx-auto text-lg font-light leading-relaxed">
            Select your destination and preferred package to begin. Our concierge team will refine
            every detail after your reservation is initiated.
          </p>
        </AnimatedSection>

        <Suspense
          fallback={
            <div className="h-96 flex items-center justify-center">
              <TravelLoader />
            </div>
          }
        >
          <BookingForm
            destinations={destinations}
            packages={packages}
            user={user}
            excursions={excursions || []}
          />
        </Suspense>
      </div>
    </main>
  )
}
