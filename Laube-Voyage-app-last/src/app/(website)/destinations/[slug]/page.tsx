import 'server-only'
import {
  getDestinationBySlug,
  getAllDestinations,
  getExcursionsByDestination,
  getPackagesByDestination,
} from '@/services/destinations'
import { DestinationPackages } from '@/components/premium-ui/DestinationPackages'
import { ExcursionCard } from '@/components/premium-ui/ExcursionCard'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const destinations = await getAllDestinations()
  return destinations.map((destination) => ({
    slug: destination.slug,
  }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

const regionLabels: Record<string, string> = {
  europe: 'Europe',
  'middle-east': 'Middle East',
  africa: 'Africa',
  asia: 'Asia',
  americas: 'Americas',
  local: 'Local (Egypt)',
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { slug } = await params
  const destination = await getDestinationBySlug(slug)

  if (!destination) {
    notFound()
  }

  // Fetch related packages and excursions
  const destinationId = String(destination.id)
  const [packages, excursions] = await Promise.all([
    getPackagesByDestination(destinationId),
    getExcursionsByDestination(destinationId),
  ])

  const imageObj = typeof destination.image === 'object' ? destination.image : undefined
  const imageUrl =
    imageObj?.url ||
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop'

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        <Image
          src={imageUrl}
          alt={destination.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pb-16">
          <AnimatedSection animation="fade-up">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex items-center gap-2 text-sm text-white/60">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link href="/destinations" className="hover:text-white transition-colors">
                    Destinations
                  </Link>
                </li>
                <li>/</li>
                <li className="text-white">{destination.name}</li>
              </ol>
            </nav>

            {/* Region Badge */}
            <div className="mb-4">
              <span className="px-4 py-1.5 text-xs uppercase tracking-widest text-white/90 font-medium bg-white/20 backdrop-blur-md rounded-full">
                {regionLabels[destination.region] || destination.region}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-serif font-light text-white mb-4">
              {destination.name}
            </h1>

            <p className="text-xl text-secondary font-light">{destination.country}</p>

            {/* Quick Stats & Booking CTA */}
            <div className="flex flex-wrap items-center gap-8 mt-8">
              {packages.length > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-serif text-accent">{packages.length}</p>
                  <p className="text-xs text-white/70 uppercase tracking-wider">Packages</p>
                </div>
              )}
              {excursions.length > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-serif text-accent">{excursions.length}</p>
                  <p className="text-xs text-white/70 uppercase tracking-wider">Excursions</p>
                </div>
              )}
              <div className="h-10 w-px bg-white/20 mx-2 hidden sm:block" />
              <Link href={`/book?destination=${destination.id}`}>
                <button className="px-8 py-3 bg-accent text-white hover:bg-white hover:text-accent transition-all duration-300 rounded-full text-xs font-bold tracking-widest uppercase shadow-xl">
                  Book This Destination
                </button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Description Section */}
      {destination.description && (
        <section className="py-16 bg-white dark:bg-[#1a1718] transition-colors">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-serif font-light text-dark dark:text-white mb-6 flex items-center justify-center gap-3">
                <span className="w-8 h-0.5 bg-accent"></span>
                About {destination.name}
                <span className="w-8 h-0.5 bg-accent"></span>
              </h2>
              <p className="text-gray dark:text-gray/90 text-lg leading-relaxed">
                {destination.description}
              </p>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Travel Packages Section */}
      <section className="py-24 bg-background dark:bg-dark transition-colors">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <span className="text-primary dark:text-secondary text-sm tracking-[0.3em] uppercase mb-4 block">
              📦 Travel Packages
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light text-dark dark:text-white transition-colors">
              Packages to {destination.name}
            </h2>
            <p className="text-gray dark:text-gray/80 mt-4 max-w-2xl mx-auto">
              Complete travel packages including flights, hotels, and curated itineraries
            </p>
          </AnimatedSection>

          <DestinationPackages packages={packages} destinationName={destination.name} />
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray/30 to-transparent"></div>
      </div>

      {/* Local Excursions Section */}
      <section className="py-24 bg-background dark:bg-dark transition-colors">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <span className="text-accent text-sm tracking-[0.3em] uppercase mb-4 block">
              🏃 Local Experiences
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light text-dark dark:text-white transition-colors">
              Excursions in {destination.name}
            </h2>
            <p className="text-gray dark:text-gray/80 mt-4 max-w-2xl mx-auto">
              Day trips, tours, and activities to enhance your experience
            </p>
          </AnimatedSection>

          {excursions.length > 0 ? (
            <AnimatedContainer
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
              staggerDelay={0.15}
            >
              {excursions.map((excursion) => (
                <ExcursionCard key={excursion.id} excursion={excursion} />
              ))}
            </AnimatedContainer>
          ) : (
            <AnimatedSection animation="fade-up" className="text-center py-12">
              <div className="inline-block p-8 border border-dark/5 dark:border-gray/10 rounded-2xl">
                <p className="text-gray dark:text-gray text-lg font-light italic transition-colors mb-4">
                  No excursions available yet for {destination.name}
                </p>
                <Link
                  href="/excursions"
                  className="inline-block px-6 py-3 border border-accent/50 text-accent text-sm tracking-widest uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-colors"
                >
                  View All Excursions
                </Link>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary dark:bg-secondary transition-colors">
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up" className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-serif font-light text-white mb-4">
              Ready to Explore {destination.name}?
            </h2>
            <p className="text-white/80 mb-8">
              Let us craft the perfect itinerary for your journey.
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-4 bg-white text-primary dark:text-secondary text-sm tracking-widest uppercase font-medium rounded-full hover:bg-white/90 transition-colors"
            >
              Plan Your Trip
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Back Link */}
      <section className="py-12 bg-background dark:bg-dark transition-colors">
        <div className="container mx-auto px-4 text-center">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 text-primary dark:text-secondary hover:underline transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to All Destinations
          </Link>
        </div>
      </section>
    </main>
  )
}
