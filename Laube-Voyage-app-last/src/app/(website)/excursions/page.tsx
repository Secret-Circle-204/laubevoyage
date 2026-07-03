import 'server-only'
import { getAllExcursions } from '@/services/excursions'
import { ExcursionsShowcase } from '@/components/premium-ui/ExcursionsShowcase'
import { AnimatedSection } from '@/components/premium-ui/AnimatedSection'
import Image from 'next/image'

export default async function ExcursionsPage() {
  const excursions = await getAllExcursions()

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=2073&auto=format&fit=crop"
          alt="Local Experiences"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-dark/40 dark:bg-dark/70 transition-colors duration-500" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up">
            <span className="text-secondary text-sm tracking-[0.4em] uppercase mb-4 block">
              Curated Adventures
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-light text-white mb-6">
              <span className="text-accent">Excursions</span>
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg font-light tracking-wide">
              Discover authentic experiences led by expert guides. From ancient wonders to culinary
              journeys.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Smart Category Showcase */}
      <ExcursionsShowcase excursions={excursions} />

      {/* Call to Action */}
      <section className="py-24 bg-white dark:bg-[#1a1718] border-y border-dark/5 dark:border-gray/5 transition-colors duration-500">
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection animation="fade-up" className="max-w-3xl mx-auto">
            <span className="text-accent text-sm tracking-[0.3em] uppercase mb-4 block">
              Private Tours
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light leading-relaxed text-dark dark:text-white transition-colors mb-6">
              Looking for a personalized experience?
            </h2>
            <p className="text-gray dark:text-gray mb-8 font-light">
              Contact us to design a bespoke excursion tailored to your interests and schedule.
            </p>
            <a
              href="/contact"
              className="inline-block px-8 py-4 bg-primary text-white text-sm tracking-widest uppercase font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              Inquire Now
            </a>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
