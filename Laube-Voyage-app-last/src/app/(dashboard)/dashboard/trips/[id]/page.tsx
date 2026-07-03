import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import { Button } from '@/components/premium-ui/Button'
import {
  Calendar,
  MapPin,
  CreditCard,
  Gem,
  Users,
  ChevronLeft,
  Mail,
  Phone,
  Globe,
  Compass,
  FileText,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type {
  Booking,
  Package,
  Excursion,
  Media as MediaType,
} from '@/payload-types'

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) return null

  let booking: Booking
  try {
    booking = await payload.findByID({
      collection: 'bookings',
      id: Number(id),
      depth: 2,
    })
  } catch {
    return notFound()
  }

  // Security: only owner can view
  const bookingUserId =
    typeof booking.user === 'object' ? booking.user.id : booking.user
  if (bookingUserId !== user.id) return notFound()

  const pkg = booking.package as Package | undefined
  const heroImageUrl =
    typeof pkg?.heroImage === 'object' && pkg?.heroImage
      ? (pkg.heroImage as MediaType).url
      : undefined
  const travelers = Array.isArray(booking.travelersList)
    ? booking.travelersList
    : []
  const excursions = (booking.selectedExcursions || []) as Excursion[]
  const pointsUsed = booking.pointsRedeemed || 0
  const discount = booking.discountAmount || 0
  const originalPrice = booking.totalPrice + discount

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'Pending Payment'
    }
  }

  return (
    <div className="space-y-10">
      {/* Back Navigation */}
      <Link
        href="/dashboard/trips"
        className="inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 hover:text-primary transition-colors font-medium"
      >
        <ChevronLeft size={16} /> Back to My Journeys
      </Link>

      {/* Hero Section */}
      <div className="relative rounded-[40px] overflow-hidden h-72 lg:h-80">
        <Image
          src={heroImageUrl || '/destinations/paris-hero.jpg'}
          alt={pkg?.title || 'Booking'}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`px-4 py-1.5 rounded-full border backdrop-blur-md text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(booking.status)}`}
            >
              {getStatusLabel(booking.status)}
            </div>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
              Booking #{String(booking.id).padStart(4, '0')}
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white tracking-tighter uppercase italic">
            {pkg?.title}
          </h1>
          <p className="text-white/60 mt-2 flex items-center gap-2 text-sm">
            <MapPin size={14} />
            {(pkg?.relatedDestination as { name?: string })?.name || 'Global Destination'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Trip Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Trip Details */}
          <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-lg">
            <h3 className="text-xl font-serif font-bold text-secondary dark:text-white uppercase italic tracking-tighter mb-6">
              Journey Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <Calendar size={12} className="text-primary" /> Departure Date
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <Globe size={12} className="text-primary" /> Destination
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {(pkg?.relatedDestination as { name?: string })?.name || 'Global'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <Users size={12} className="text-primary" /> Travelers
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {travelers.length} {travelers.length === 1 ? 'Guest' : 'Guests'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <Mail size={12} className="text-primary" /> Contact Email
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {booking.contactEmail}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <Phone size={12} className="text-primary" /> Contact Phone
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {booking.contactPhone}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                  <FileText size={12} className="text-primary" /> Booked On
                </p>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {new Date(booking.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Travelers List */}
          {travelers.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-lg">
              <h3 className="text-xl font-serif font-bold text-secondary dark:text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2">
                <Users size={18} className="text-primary" /> Travelers
              </h3>
              <div className="space-y-4">
                {travelers.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="flex items-center justify-between p-5 bg-stone-50 dark:bg-white/5 rounded-2xl border border-stone-100 dark:border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800 dark:text-white text-sm">
                          {t.fullName}
                        </p>
                        {t.passportNumber && (
                          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                            Passport: {t.passportNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                      {t.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Excursions */}
          {excursions.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-lg">
              <h3 className="text-xl font-serif font-bold text-secondary dark:text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2">
                <Compass size={18} className="text-primary" /> Selected Excursions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {excursions.map((exc) => {
                  const excImage =
                    typeof exc.mainImage === 'object' && exc.mainImage
                      ? (exc.mainImage as MediaType).url
                      : undefined
                  return (
                    <div
                      key={exc.id}
                      className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-white/5 rounded-2xl border border-stone-100 dark:border-white/10"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        {excImage ? (
                          <Image
                            src={excImage}
                            alt={exc.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Compass size={20} className="text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-stone-800 dark:text-white">
                          {exc.title}
                        </p>
                        {exc.price && (
                          <p className="text-xs text-primary font-bold">
                            ${exc.price}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Invoice */}
        <div className="space-y-8">
          {/* Invoice Card */}
          <div className="bg-white dark:bg-[#121212]/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-2xl sticky top-28">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard size={18} className="text-primary" />
              <h3 className="text-xl font-serif font-bold text-secondary dark:text-white uppercase italic tracking-tighter">
                Invoice
              </h3>
            </div>

            <div className="space-y-4 mb-8">
              {/* Package Price */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  Package ({pkg?.title})
                </span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  ${originalPrice.toLocaleString()}
                </span>
              </div>

              {/* Excursion pricing if available */}
              {excursions.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    Excursions ({excursions.length})
                  </span>
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                    Included
                  </span>
                </div>
              )}

              {/* Points Discount */}
              {discount > 0 && (
                <>
                  <div className="w-full h-px bg-stone-200 dark:bg-white/10" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-600 dark:text-stone-400">
                      Subtotal
                    </span>
                    <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                      ${originalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/5 dark:bg-primary/10 -mx-4 px-4 py-3 rounded-xl">
                    <span className="text-sm text-primary font-medium flex items-center gap-1.5">
                      <Gem size={14} /> Loyalty Points ({pointsUsed.toLocaleString()} pts)
                    </span>
                    <span className="text-sm font-bold text-primary">
                      -${discount.toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              <div className="w-full h-px bg-stone-200 dark:bg-white/10" />

              {/* Total */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-stone-800 dark:text-white">
                  {booking.status === 'cancelled' ? 'Refunded' : 'Total Paid'}
                </span>
                <span className="text-3xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
                  ${booking.totalPrice?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Status */}
            <div
              className={`w-full text-center py-3 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] ${getStatusStyle(booking.status)}`}
            >
              {booking.status === 'confirmed' || booking.status === 'completed'
                ? '✓ Payment Confirmed'
                : booking.status === 'cancelled'
                  ? '✕ Booking Cancelled'
                  : '⏳ Awaiting Payment'}
            </div>

            {/* Actions */}
            {booking.status === 'pending' && (
              <Link href={`/booking/pay?id=${booking.id}`} className="block mt-4">
                <Button className="w-full bg-primary text-secondary hover:bg-orange-400 border-primary rounded-2xl text-xs uppercase tracking-widest h-12">
                  Complete Payment
                </Button>
              </Link>
            )}

            {/* Booking Meta */}
            <div className="mt-8 pt-6 border-t border-stone-100 dark:border-white/10 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Booking ID</span>
                <span className="font-bold text-stone-600 dark:text-stone-300">
                  #{String(booking.id).padStart(4, '0')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Created</span>
                <span className="font-bold text-stone-600 dark:text-stone-300">
                  {new Date(booking.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Last Updated</span>
                <span className="font-bold text-stone-600 dark:text-stone-300">
                  {new Date(booking.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
