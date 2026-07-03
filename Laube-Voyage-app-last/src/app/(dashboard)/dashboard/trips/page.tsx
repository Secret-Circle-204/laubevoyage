import { headers } from 'next/headers'
import { Button } from '@/components/premium-ui/Button'
import { Calendar, MapPin, CreditCard, Gem, Users, Receipt } from 'lucide-react'
import { getCurrentUser, getDashboardBookings } from '@/services/dashboard'
import Image from 'next/image'
import Link from 'next/link'
import type { Package, Media as MediaType } from '@/payload-types'

export default async function MyTripsPage() {
  const user = await getCurrentUser(await headers())

  if (!user) return null

  const bookings = await getDashboardBookings(user.id)

  // Stats
  const totalTrips = bookings.length
  const totalPaid = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
  const totalSaved = bookings.reduce((sum, b) => sum + (b.discountAmount || 0), 0)

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter uppercase italic">
            My Journeys
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">
            A complete history of your bespoke travel experiences and payments.
          </p>
        </div>
        <Link href="/packages">
          <Button className="bg-primary text-secondary hover:bg-white border-primary">
            Book New Journey
          </Button>
        </Link>
      </div>

      {/* Trip Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Total Journeys
            </span>
          </div>
          <p className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
            {totalTrips}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Total Invested
            </span>
          </div>
          <p className="text-4xl font-serif font-bold text-emerald-500 tracking-tighter">
            ${totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Gem size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Saved with Points
            </span>
          </div>
          <p className="text-4xl font-serif font-bold text-primary tracking-tighter">
            ${totalSaved.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 gap-8">
        {bookings.length > 0 ? (
          bookings.map((booking) => {
            const pkg = booking.package as Package | undefined
            const heroImageUrl =
              typeof pkg?.heroImage === 'object' && pkg?.heroImage
                ? (pkg.heroImage as MediaType).url
                : undefined
            const pointsUsed = booking.pointsRedeemed || 0
            const discount = booking.discountAmount || 0
            const originalPrice = booking.totalPrice + discount
            const travelersCount = Array.isArray(booking.travelersList)
              ? booking.travelersList.length
              : 0

            return (
              <div
                key={booking.id}
                className="group bg-white dark:bg-white/5 rounded-[32px] overflow-hidden border border-stone-100 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-1/3 relative h-64 lg:h-auto min-h-[250px]">
                    <Image
                      src={heroImageUrl || '/destinations/paris-hero.jpg'}
                      alt={pkg?.title || 'Booking'}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                    <div
                      className={`absolute top-6 left-6 px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(booking.status)}`}
                    >
                      {getStatusLabel(booking.status)}
                    </div>
                    {/* Booking ID */}
                    <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                        #{String(booking.id).padStart(4, '0')}
                      </span>
                    </div>
                  </div>

                  <div className="lg:w-2/3 p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-6 gap-4">
                        <div>
                          <h3 className="text-3xl font-serif font-bold text-secondary dark:text-white tracking-tight italic uppercase">
                            {pkg?.title}
                          </h3>
                          <p className="text-sm text-stone-400 mt-1">
                            {(pkg?.relatedDestination as { name?: string })?.name ||
                              'Global Destination'}
                          </p>
                        </div>
                      </div>

                      {/* Trip Meta */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary" /> Departure
                          </p>
                          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                            {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                            <Users size={12} className="text-primary" /> Travelers
                          </p>
                          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                            {travelersCount} {travelersCount === 1 ? 'Guest' : 'Guests'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                            <Receipt size={12} className="text-primary" /> Payment
                          </p>
                          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">
                            {booking.status === 'confirmed' || booking.status === 'completed'
                              ? 'Paid'
                              : booking.status === 'cancelled'
                                ? 'Refunded'
                                : 'Awaiting'}
                          </p>
                        </div>
                      </div>

                      {/* Invoice Breakdown */}
                      <div className="bg-stone-50 dark:bg-white/5 rounded-2xl p-6 border border-stone-100 dark:border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 flex items-center gap-2">
                          <CreditCard size={12} className="text-primary" /> Payment Breakdown
                        </p>
                        <div className="space-y-3">
                          {discount > 0 && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-stone-600 dark:text-stone-300">
                                  Subtotal
                                </span>
                                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                                  ${originalPrice.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-primary flex items-center gap-1.5">
                                  <Gem size={12} /> Points Discount ({pointsUsed.toLocaleString()}{' '}
                                  pts)
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  -${discount.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full h-px bg-stone-200 dark:bg-white/10" />
                            </>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-stone-800 dark:text-white">
                              {discount > 0 ? 'Amount Paid' : 'Total Price'}
                            </span>
                            <span className="text-2xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
                              ${booking.totalPrice?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-4 pt-6 mt-6 border-t border-stone-100 dark:border-white/5">
                      {booking.status === 'pending' && (
                        <Link href={`/booking/pay?id=${booking.id}`}>
                          <Button className="bg-primary text-secondary hover:bg-orange-400 border-primary rounded-xl text-xs uppercase tracking-widest px-8 h-10">
                            Complete Payment
                          </Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/trips/${booking.id}`}>
                        <Button
                          variant="outline"
                          className="rounded-xl border-stone-200 dark:border-white/10 text-xs uppercase tracking-widest px-8 h-10"
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[40px] border border-stone-100 dark:border-white/10">
            <MapPin size={48} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
            <p className="text-stone-400 font-serif italic text-lg">No journeys scheduled yet.</p>
            <Link
              href="/packages"
              className="inline-block mt-4 text-primary font-bold text-sm hover:underline"
            >
              Explore Collections →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
