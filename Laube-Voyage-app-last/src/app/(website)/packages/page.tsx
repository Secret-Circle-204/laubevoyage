import 'server-only'
import { getAllPackages } from '@/services/packages'
import { getAllDestinations, getAllCities } from '@/services/destinations'
import { PackagesClient } from '@/app/(website)/packages/PackagesClient'
import { AnimatedSection } from '@/components/premium-ui/AnimatedSection'
import Image from 'next/image'

export default async function PackagesPage() {
  const [packages, destinations, cities] = await Promise.all([
    getAllPackages(),
    getAllDestinations(),
    getAllCities(),
  ])

  return (
    <main className="min-h-screen bg-[#FAFAFA] dark:bg-[#231F20] transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
          alt="Travel Packages"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#231F20]/50 dark:bg-[#231F20]/70 transition-colors duration-500" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up">
            <span className="text-[#00AEEF] text-sm tracking-[0.4em] uppercase mb-4 block">
              Curated Collections
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-light text-white mb-6">
              <span className="text-[#F58220]">Packages</span>
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg font-light tracking-wide">
              Discover handcrafted travel experiences designed for the discerning traveler.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Packages with Filters */}
      <PackagesClient initialPackages={packages} destinations={destinations} cities={cities} />
    </main>
  )
}
