import { getPackageBySlug, getAllPackages } from '@/services/packages'
// Destination excursions fetched via city-based cross-sell below
import { getExcursionsByCity } from '@/services/excursions'
import { ExcursionCard } from '@/components/premium-ui/ExcursionCard'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AnimatedSection, AnimatedContainer } from '@/components/premium-ui/AnimatedSection'
import Link from 'next/link'
import { PackageBookingWidget } from '@/components/premium-ui/PackageBookingWidget'
import { PackageHotels } from '@/components/packages/PackageHotels'
import { SimpleRichText } from '@/components/ui/SimpleRichText'
import { Clock, Map, Users, Globe, MapPin } from 'lucide-react'
import type { Excursion, Media } from '@/payload-types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const packages = await getAllPackages()
  return packages
    .filter((pkg) => typeof pkg.slug === 'string' && pkg.slug.length > 0)
    .map((pkg) => ({
      slug: pkg.slug,
    }))
}

export default async function PackageDetailPage({ params }: Props) {
  const { slug } = await params
  const pkg = await getPackageBySlug(slug)

  if (!pkg) notFound()

  // Safely extract destination ID
  const safeDestinationId = pkg.relatedDestination
    ? typeof pkg.relatedDestination === 'object'
      ? pkg.relatedDestination.id
      : pkg.relatedDestination
    : ''

  // Safely extract city ID (city is an array of City | number)
  const firstCity = Array.isArray(pkg.city) && pkg.city.length > 0 ? pkg.city[0] : null
  const safeCityId = firstCity ? (typeof firstCity === 'object' ? firstCity.id : firstCity) : ''

  // Smart cross-sell: Show excursions from the same city only
  let relatedExcursions: Excursion[] = []
  if (safeCityId) {
    relatedExcursions = await getExcursionsByCity(String(safeCityId))
  }

  const heroImage = typeof pkg.heroImage === 'object' ? pkg.heroImage : undefined
  const imageUrl =
    heroImage?.url ||
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'

  const destinationName =
    pkg.relatedDestination && typeof pkg.relatedDestination === 'object'
      ? pkg.relatedDestination.name
      : null
  const destinationSlug =
    pkg.relatedDestination && typeof pkg.relatedDestination === 'object'
      ? pkg.relatedDestination.slug
      : null

  const cityName = firstCity && typeof firstCity === 'object' ? firstCity.name : null

  // Gallery images
  // Since gallery in Packages.ts is defined as upload with hasMany: true, it returns an array of Media objects/IDs directly
  const galleryImages = pkg.gallery
    ?.map((g) => (typeof g === 'object' ? g : null))
    .filter(Boolean) as Media[] | undefined

  // Quick info items
  const quickInfo = [
    { icon: Clock, label: 'Duration', value: pkg.duration },
    { icon: Map, label: 'Tour Type', value: pkg.tourType },
    { icon: Users, label: 'Group Size', value: pkg.groupSize },
    { icon: Globe, label: 'Languages', value: pkg.languages },
    { icon: MapPin, label: 'City', value: cityName },
  ].filter((item) => item.value)

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[70vh] overflow-hidden">
        <Image
          src={imageUrl}
          alt={pkg.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-dark/40 dark:bg-dark/70 transition-colors" />

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-24">
          <AnimatedSection animation="fade-up">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-4 items-center mb-6">
                {destinationName && (
                  <Link href={`/destinations/${destinationSlug}`}>
                    <span className="px-4 py-1.5 bg-secondary/80 backdrop-blur-md text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm hover:bg-secondary transition-colors cursor-pointer">
                      {destinationName}
                    </span>
                  </Link>
                )}
                {cityName && (
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm">
                    {cityName}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-light text-white mb-6 border-l-4 border-secondary pl-8">
                {pkg.title}
              </h1>
            </div>
            <Link href={`/book?package=${pkg.id}&destination=${safeDestinationId}`}>
              <span className="px-4 py-1.5 bg-white text-accent text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm hover:bg-accent hover:text-white transition-all cursor-pointer shadow-lg">
                Book Now
              </span>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Quick Info Bar */}
      {quickInfo.length > 0 && (
        <AnimatedSection animation="fade-up">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
            <div className="bg-blue-900 dark:bg-[#1a1718] rounded-2xl shadow-2xl border border-dark/5 dark:border-gray/10 p-6 md:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {quickInfo.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                        <Icon size={18} className="text-white dark:text-accent" />
                      </div>
                      <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-white dark:text-gray/60">
                        {item.label}
                      </span>
                      <span className="text-sm font-serif font-medium text-white dark:text-white capitalize">
                        {item.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}

      <div className="container mx-auto py-24 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-20">
            {/* Description / The Experience */}
            {pkg.description && (
              <AnimatedSection animation="fade-up" delay={0.2}>
                <h2 className="text-3xl font-serif font-light mb-8 text-dark dark:text-white transition-colors">
                  The <span className="text-accent">Experience</span>
                </h2>
                <div className="prose prose-lg max-w-none dark:prose-invert text-gray dark:text-gray/90 leading-loose text-lg font-light tracking-wide transition-colors">
                  <SimpleRichText content={pkg.description} />
                </div>
              </AnimatedSection>
            )}

            {/* Itinerary */}
            {pkg.itinerary && (
              <AnimatedSection animation="fade-up" delay={0.2}>
                <h2 className="text-3xl font-serif font-light mb-8 text-dark dark:text-white transition-colors">
                  Trip <span className="text-accent">Itinerary</span>
                </h2>
                <div className="prose prose-lg max-w-none dark:prose-invert text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                  <SimpleRichText content={pkg.itinerary} />
                </div>
              </AnimatedSection>
            )}

            {/* What's Included */}
            {pkg.whatsIncluded && (
              <AnimatedSection animation="fade-up" delay={0.2}>
                <h2 className="text-3xl font-serif font-light mb-8 text-dark dark:text-white transition-colors">
                  What&apos;s <span className="text-secondary">Included</span>
                </h2>
                <div className="prose prose-lg max-w-none dark:prose-invert text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                  <SimpleRichText content={pkg.whatsIncluded} />
                </div>
              </AnimatedSection>
            )}

            {/* Gallery */}
            {galleryImages && galleryImages.length > 0 && (
              <AnimatedSection animation="fade-up" delay={0.3}>
                <h2 className="text-3xl font-serif font-light mb-8 text-dark dark:text-white transition-colors">
                  Photo <span className="text-secondary">Gallery</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
                    >
                      <Image
                        src={img.url || ''}
                        alt={img.alt || `Gallery image ${idx + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/20 transition-colors duration-500" />
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            )}

            {/* HOTELS SECTION */}
            {pkg.hotels && pkg.hotels.length > 0 && (
              <AnimatedSection animation="fade-up" delay={0.4}>
                <PackageHotels hotels={pkg.hotels} />
              </AnimatedSection>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <AnimatedSection animation="fade-left" delay={0.4}>
              <PackageBookingWidget
                packageId={String(pkg.id)}
                destinationId={String(safeDestinationId)}
                price={pkg.adultPrice || pkg.price || 0}
                dates={pkg.dates || []}
              />
            </AnimatedSection>
          </div>
        </div>

        {/* RELATED EXCURSIONS (UPSELLING) */}
        {relatedExcursions.length > 0 && (
          <div className="mt-32">
            <AnimatedSection animation="fade-up">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <span className="text-accent text-sm tracking-[0.3em] uppercase mb-4 block">
                    Enhance Your Stay
                  </span>
                  <h2 className="text-4xl font-serif font-light text-dark dark:text-white">
                    Recommended <span className="text-secondary">Excursions</span>
                  </h2>
                </div>
                <Link
                  href="/excursions"
                  className="text-secondary hover:underline tracking-widest uppercase text-xs font-bold mb-2 hidden md:block"
                >
                  View All Excursions →
                </Link>
              </div>

              <AnimatedContainer
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                staggerDelay={0.1}
              >
                {relatedExcursions.slice(0, 3).map((excursion) => (
                  <ExcursionCard key={excursion.id} excursion={excursion} />
                ))}
              </AnimatedContainer>
            </AnimatedSection>
          </div>
        )}

        {/* Back to Collections */}
        <div className="mt-32 pt-12 border-t border-gray/10 flex justify-center">
          <Link href="/packages">
            <button className="px-12 py-5 border border-primary/50 dark:border-secondary/50 text-primary dark:text-secondary text-xs tracking-[0.3em] uppercase hover:bg-accent hover:text-white hover:border-accent transition-all duration-500">
              Back to Collections
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
