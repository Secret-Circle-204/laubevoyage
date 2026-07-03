import 'server-only'
import { getExcursionBySlug, getAllExcursions } from '@/services/excursions'
import { AnimatedSection } from '@/components/premium-ui/AnimatedSection'
import { SimpleRichText } from '@/components/ui/SimpleRichText'
import Image from 'next/image'
import Link from 'next/link'
import { ReviewsSection } from '@/components/premium-ui/ReviewsSection'
import { notFound } from 'next/navigation'
import { Clock, Map, Users, Globe, MapPin, CheckCircle2 } from 'lucide-react'

export async function generateStaticParams() {
  const excursions = await getAllExcursions()
  return excursions.map((excursion) => ({
    slug: excursion.slug,
  }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

const categoryColors: Record<string, string> = {
  'sea-trips': 'bg-cyan-500/90',
  'safari-adventure': 'bg-emerald-500/90',
  'cultural-history': 'bg-amber-600/90',
  'family-kids': 'bg-pink-500/90',
}

const categoryLabels: Record<string, string> = {
  'sea-trips': 'Sea Trips',
  'safari-adventure': 'Safari & Adventure',
  'cultural-history': 'Cultural & History',
  'family-kids': 'Family & Kids',
}

export default async function ExcursionDetailPage({ params }: PageProps) {
  const { slug } = await params
  const excursion = await getExcursionBySlug(slug)

  if (!excursion) {
    notFound()
  }

  const mainImage = typeof excursion.mainImage === 'object' ? excursion.mainImage : undefined
  const imageUrl =
    mainImage?.url ||
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'

  const destination =
    excursion.relatedDestination && typeof excursion.relatedDestination === 'object'
      ? excursion.relatedDestination
      : null

  // Safely extract cities
  const cities = excursion.city
    ?.map((c) => (typeof c === 'object' ? c.name : null))
    .filter(Boolean)
    .join(', ')

  // Quick info items setup
  const quickInfo = [
    { icon: Clock, label: 'Duration', value: excursion.duration },
    { icon: Map, label: 'Tour Type', value: excursion.tourType },
    { icon: Users, label: 'Group Size', value: excursion.groupSize },
    { icon: Globe, label: 'Languages', value: excursion.languages },
    { icon: MapPin, label: 'City', value: cities },
  ].filter((item) => item.value)

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        <Image
          src={imageUrl}
          alt={excursion.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-24">
          <AnimatedSection animation="fade-up">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-4 items-center mb-6">
                {/* Breadcrumb */}
                <nav>
                  <ol className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-bold text-white/60">
                    <li>
                      <Link href="/" className="hover:text-white transition-colors">
                        Home
                      </Link>
                    </li>
                    <li>/</li>
                    <li>
                      <Link href="/excursions" className="hover:text-white transition-colors">
                        Excursions
                      </Link>
                    </li>
                    <li>/</li>
                    <li className="text-white">{excursion.title}</li>
                  </ol>
                </nav>
              </div>

              {/* Category & Location */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span
                  className={`px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase font-bold text-white rounded-sm ${categoryColors[excursion.category] || 'bg-gray-500'}`}
                >
                  {categoryLabels[excursion.category] || excursion.category}
                </span>
                {destination && (
                  <Link href={`/destinations/${destination.slug}`}>
                    <span className="px-4 py-1.5 bg-secondary/80 backdrop-blur-md text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm hover:bg-secondary transition-colors cursor-pointer">
                      {destination.name}
                    </span>
                  </Link>
                )}
                {cities && (
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm">
                    {cities}
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-6xl font-serif font-light text-white mb-6 border-l-4 border-secondary pl-8">
                {excursion.title}
              </h1>

              {/* Quick Info */}
              <div className="flex flex-wrap items-center gap-6 mt-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-white/60">
                    Price
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-accent font-semibold text-3xl">
                      ${excursion.price?.toLocaleString()}
                    </span>
                    <span className="text-sm text-white/80">/ person</span>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Content Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-20">
              {/* Description */}
              <AnimatedSection animation="fade-up" delay={0.2}>
                <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-8 border-l-4 border-accent pl-6">
                  The Experience
                </h2>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                  {excursion.description ? (
                    <SimpleRichText content={excursion.description} />
                  ) : (
                    <p className="leading-relaxed">
                      Immerse yourself in an unforgettable experience. This excursion has been
                      crafted by our local experts to ensure an authentic and memorable adventure.
                    </p>
                  )}
                </div>
              </AnimatedSection>

              {/* Itinerary */}
              {excursion.itinerary && (
                <AnimatedSection animation="fade-up" delay={0.2}>
                  <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-8 border-l-4 border-secondary pl-6">
                    Trip Itinerary
                  </h2>
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                    <SimpleRichText content={excursion.itinerary} />
                  </div>
                </AnimatedSection>
              )}

              {/* What's Included */}
              {excursion.whatsIncluded && (
                <AnimatedSection animation="fade-up" delay={0.2}>
                  <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-8 border-l-4 border-blue-500 pl-6">
                    What&apos;s Included
                  </h2>
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                    <SimpleRichText content={excursion.whatsIncluded} />
                  </div>
                </AnimatedSection>
              )}

              {/* What To Bring */}
              {excursion.whatToBring && (
                <AnimatedSection animation="fade-up" delay={0.2}>
                  <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-8 border-l-4 border-amber-500 pl-6">
                    What To Bring
                  </h2>
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray dark:text-gray/90 leading-loose font-light tracking-wide transition-colors">
                    <SimpleRichText content={excursion.whatToBring} />
                  </div>
                </AnimatedSection>
              )}

              {/* Gallery Section */}
              {excursion.gallery && excursion.gallery.length > 0 && (
                <AnimatedSection animation="fade-up" delay={0.3}>
                  <h2 className="text-3xl font-serif font-light text-dark dark:text-white mb-8 border-l-4 border-primary pl-6">
                    Photo Gallery
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {excursion.gallery.map((item, index) => {
                      const galleryImage = typeof item === 'object' ? item : undefined
                      return (
                        <div
                          key={index}
                          className="relative aspect-4/3 rounded-xl overflow-hidden group cursor-pointer"
                        >
                          <Image
                            src={galleryImage?.url || imageUrl}
                            alt={`${excursion.title} gallery ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/20 transition-colors duration-500" />
                        </div>
                      )
                    })}
                  </div>
                </AnimatedSection>
              )}

              {/* Reviews Section */}
              <ReviewsSection
                excursionId={String(excursion.id)}
                excursionTitle={excursion.title}
              />
            </div>

            {/* Sidebar (Sticky Container) */}
            <div className="lg:col-span-1 h-full">
              <div className="sticky top-24 p-8 bg-white dark:bg-[#1a1718] rounded-2xl border border-dark/5 dark:border-gray/10 shadow-2xl">
                <h3 className="text-2xl font-serif text-dark dark:text-white mb-8">
                  Book This Experience
                </h3>

                <div className="mb-8 space-y-4">
                  <div className="flex justify-between items-end border-b border-dark/5 dark:border-white/5 pb-4">
                    <span className="text-gray dark:text-gray/80 text-sm tracking-widest uppercase font-medium">
                      Price per person
                    </span>
                    <span className="text-3xl font-bold text-accent">
                      ${excursion.price?.toLocaleString()}
                    </span>
                  </div>
                  {excursion.duration && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray dark:text-gray/80">Duration</span>
                      <span className="text-dark dark:text-white font-medium">
                        {excursion.duration}
                      </span>
                    </div>
                  )}
                  {excursion.tourType && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray dark:text-gray/80">Tour Type</span>
                      <span className="text-dark dark:text-white font-medium">
                        {excursion.tourType}
                      </span>
                    </div>
                  )}
                </div>

                <Link
                  href={`/book?destination=${destination ? destination.id : excursion.relatedDestination || ''}&excursion=${excursion.id}`}
                  className="block w-full mb-4"
                >
                  <button className="w-full py-5 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.3em] uppercase font-bold rounded-sm shadow-xl transition-all hover:scale-[1.02] w-full">
                    Request Booking
                  </button>
                </Link>

                <Link
                  href={`/contact?subject=reservation&message=${encodeURIComponent(`I would like to ask about the excursion: ${excursion.title}`)}`}
                  className="block w-full"
                >
                  <button className="w-full py-5 border border-primary/50 text-primary dark:text-secondary text-xs tracking-[0.3em] uppercase font-bold rounded-sm hover:bg-primary hover:text-white dark:hover:bg-secondary transition-all w-full">
                    Ask a Question
                  </button>
                </Link>

                {/* Features List */}
                <div className="mt-8 pt-8 border-t border-dark/5 dark:border-white/5">
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm text-gray dark:text-gray/90">
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                      <span>Best price guarantee</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray dark:text-gray/90">
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                      <span>Premium local guides</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray dark:text-gray/90">
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                      <span>Instant confirmation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Excursions */}
      <div className="pt-12 pb-24 border-t border-gray/10 flex justify-center">
        <Link href="/excursions">
          <button className="px-12 py-5 border border-primary/50 dark:border-secondary/50 text-primary dark:text-secondary text-xs tracking-[0.3em] uppercase font-bold hover:bg-accent hover:text-white hover:border-accent transition-all duration-500">
            Back to All Excursions
          </button>
        </Link>
      </div>
    </main>
  )
}
