import 'server-only'
import { getAllDestinations } from '@/services/destinations'
import { DestinationCard } from '@/components/premium-ui/DestinationCard'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'
import Image from 'next/image'

export default async function DestinationsPage() {
  const destinations = await getAllDestinations()

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2031&auto=format&fit=crop"
          alt="World Destinations"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-dark/50 dark:bg-dark/70 transition-colors duration-500" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up">
            <span className="text-secondary text-sm tracking-[0.4em] uppercase mb-4 block">
              Explore The World
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-light text-white mb-6">
              {' '}
              <span className="text-accent">Destinations</span>
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg font-light tracking-wide">
              From ancient wonders to modern marvels. Discover the places that inspire extraordinary
              journeys.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {destinations.length > 0 ? (
            <AnimatedContainer
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              staggerDelay={0.15}
            >
              {destinations.map((destination) => (
                <DestinationCard key={destination.id} destination={destination} />
              ))}
            </AnimatedContainer>
          ) : (
            <AnimatedSection animation="fade-up" className="text-center py-24">
              <div className="inline-block p-12 border border-dark/5 dark:border-gray/10 rounded-2xl">
                <p className="text-gray dark:text-gray text-xl font-light italic transition-colors">
                  New destinations are being added...
                </p>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-[#1a1718] border-y border-dark/5 dark:border-gray/5 transition-colors duration-500">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fade-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-serif text-accent mb-2">{destinations.length}+</p>
                <p className="text-xs tracking-widest uppercase text-gray dark:text-gray">
                  Destinations
                </p>
              </div>
              <div>
                <p className="text-4xl font-serif text-accent mb-2">6</p>
                <p className="text-xs tracking-widest uppercase text-gray dark:text-gray">
                  Regions
                </p>
              </div>
              <div>
                <p className="text-4xl font-serif text-accent mb-2">50+</p>
                <p className="text-xs tracking-widest uppercase text-gray dark:text-gray">
                  Experiences
                </p>
              </div>
              <div>
                <p className="text-4xl font-serif text-accent mb-2">24/7</p>
                <p className="text-xs tracking-widest uppercase text-gray dark:text-gray">
                  Support
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
