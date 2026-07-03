import { headers } from 'next/headers'
import { Button } from '@/components/premium-ui/Button'
import TierVisualizer from '@/components/dashboard/TierVisualizer'
import {
  getCurrentUser,
  getDashboardBookings,
  getDashboardRecentPoints,
  getDashboardPointsSummary,
} from '@/services/dashboard'
import {
  Calendar,
  MapPin,
  ArrowUpRight,
  TrendingUp,
  History,
  CreditCard,
  Gem,
  Map,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import type { User, Package, LoyaltyPoint, Media as MediaType } from '@/payload-types'

function getTypeLabel(t: LoyaltyPoint): string {
  if (t.type === 'earned') return 'Booking Reward'
  if (t.type === 'redeemed') return 'Points Used'
  if (t.points > 0) return 'Bonus Credit'
  return 'Points Redeemed'
}

export default async function DashboardPage() {
  const user = await getCurrentUser(await headers())

  if (!user) return null

  // Fetch all dashboard stats concurrently using unified service
  const [allBookings, recentPoints, pointsSummary] = await Promise.all([
    getDashboardBookings(user.id),
    getDashboardRecentPoints(user.id),
    getDashboardPointsSummary(user.id),
  ])

  const nextBooking = allBookings.find((b) => b.status === 'confirmed')
  const nextPackage = nextBooking?.package as Package | undefined

  // Stats
  const totalTrips = allBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  ).length
  const totalInvested = allBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
  const totalSavedWithPoints = allBookings.reduce((sum, b) => sum + (b.discountAmount || 0), 0)

  // Recent bookings (last 3)
  const recentBookings = allBookings.slice(0, 3)

  const lifetimeEarned = pointsSummary.totalEarned

  const typedUser = user as User
  const totalSpend = typedUser.totalSpend || 0
  const loyaltyPoints = typedUser.loyaltyPoints || 0
  const currentTier = (typedUser.loyaltyTier || 'traveler') as 'traveler' | 'explorer' | 'voyager'

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-500'
      case 'completed':
        return 'bg-blue-500/10 text-blue-500'
      case 'cancelled':
        return 'bg-red-500/10 text-red-500'
      default:
        return 'bg-amber-500/10 text-amber-500'
    }
  }

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-secondary dark:text-white tracking-tighter uppercase italic">
            Welcome back, {typedUser.email?.split('@')[0]}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">
            Your exclusive gateway to bespoke travel experiences.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/packages">
            <Button className="bg-primary text-secondary hover:bg-white border-primary">
              Book New Journey
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 lg:p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Map size={14} className="text-primary" />
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Total Trips
            </span>
          </div>
          <p className="text-3xl lg:text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
            {totalTrips}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 lg:p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-emerald-500" />
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Invested
            </span>
          </div>
          <p className="text-3xl lg:text-4xl font-serif font-bold text-emerald-500 tracking-tighter">
            ${totalInvested.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 lg:p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Gem size={14} className="text-primary" />
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Points Saved
            </span>
          </div>
          <p className="text-3xl lg:text-4xl font-serif font-bold text-primary tracking-tighter">
            ${totalSavedWithPoints.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 lg:p-8 border border-stone-100 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              Balance
            </span>
          </div>
          <p className="text-3xl lg:text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter">
            {loyaltyPoints.toLocaleString()}
            <span className="text-xs font-sans uppercase tracking-widest text-stone-400 ml-1">
              pts
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tier Visualizer - Spans 8 cols */}
        <div className="lg:col-span-8">
          <TierVisualizer
            currentTier={currentTier}
            totalSpend={totalSpend}
            pointsEarned={lifetimeEarned}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Points Card */}
          <div className="bg-linear-to-br from-secondary to-[#1A1A1A] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Available Credit
                </span>
              </div>
              <div className="text-5xl font-serif font-bold tracking-tighter mb-1">
                {loyaltyPoints.toLocaleString()}
              </div>
              <p className="text-xs text-stone-400 font-medium">
                {loyaltyPoints >= 5000 ? (
                  <>
                    Redeem for <span className="text-primary font-bold">up to $350</span> off
                  </>
                ) : loyaltyPoints >= 2000 ? (
                  <>
                    Redeem for <span className="text-primary font-bold">up to $120</span> off
                  </>
                ) : loyaltyPoints >= 1000 ? (
                  <>
                    Redeem for <span className="text-primary font-bold">up to $55</span> off
                  </>
                ) : loyaltyPoints >= 500 ? (
                  <>
                    Redeem for <span className="text-primary font-bold">$25</span> off
                  </>
                ) : (
                  <>{500 - loyaltyPoints} more points to first reward</>
                )}
              </p>

              <Link href="/dashboard/points" className="block mt-8">
                <Button
                  variant="ghost"
                  className="w-full border-white/10 hover:bg-white/5 text-xs uppercase tracking-widest gap-2"
                >
                  Point Details <ArrowUpRight size={14} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-stone-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  Recent Activity
                </h4>
              </div>
              <Link
                href="/dashboard/points"
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentPoints.length > 0 ? (
                recentPoints.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between group cursor-default"
                  >
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {getTypeLabel(p)}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div
                      className={`text-xs font-bold ${
                        p.points > 0 ? 'text-emerald-500' : 'text-primary'
                      }`}
                    >
                      {p.points > 0 ? '+' : ''}
                      {p.points}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 text-center py-4 italic">
                  No recent activity found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      {recentBookings.length > 0 && (
        <div className="bg-white dark:bg-[#121212]/50 backdrop-blur-3xl rounded-[40px] p-10 border border-stone-100 dark:border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-serif font-bold text-secondary dark:text-white uppercase tracking-tighter italic">
                Recent Bookings
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-1">
                Your latest travel reservations at a glance.
              </p>
            </div>
            <Link href="/dashboard/trips">
              <Button
                variant="ghost"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border border-primary/20 px-6 rounded-none"
              >
                View All <ArrowUpRight size={12} className="ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentBookings.map((booking) => {
              const pkg = booking.package as Package | undefined
              const heroImageUrl =
                typeof pkg?.heroImage === 'object' && pkg?.heroImage
                  ? (pkg.heroImage as MediaType).url
                  : undefined
              const discount = booking.discountAmount || 0

              return (
                <Link key={booking.id} href={`/dashboard/trips/${booking.id}`}>
                  <div className="group flex items-center gap-6 p-4 bg-stone-50/50 dark:bg-white/5 border border-stone-100 dark:border-white/5 rounded-2xl hover:border-primary/30 transition-all duration-300 cursor-pointer">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                      {heroImageUrl ? (
                        <img
                          src={heroImageUrl}
                          alt={pkg?.title || ''}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-white/10 flex items-center justify-center">
                          <MapPin size={20} className="text-stone-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-bold text-secondary dark:text-white truncate uppercase">
                          {pkg?.title || 'Booking'}
                        </h4>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${getStatusStyle(booking.status)}`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-stone-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Receipt size={10} />#{String(booking.id).padStart(4, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-serif font-bold text-secondary dark:text-white tracking-tighter">
                        ${booking.totalPrice?.toLocaleString()}
                      </p>
                      {discount > 0 && (
                        <p className="text-[10px] text-primary font-bold">Saved ${discount}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Next Adventure Detail */}
      <div className="bg-white dark:bg-white/5 rounded-[40px] p-2 border border-stone-100 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 items-center gap-8 p-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Your Next Adventure
              </span>
            </div>
            <h3 className="text-3xl font-serif font-bold text-secondary dark:text-white uppercase italic">
              {nextPackage ? nextPackage.title : 'Ready for a new escape?'}
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm leading-relaxed">
              {nextPackage
                ? nextPackage.excerpt || 'Your bespoke itinerary is being prepared.'
                : 'Explore our curated collection of luxury destinations and embark on your next unforgettable journey.'}
            </p>
          </div>

          {nextBooking ? (
            <>
              <div className="flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-white/5 rounded-3xl">
                <Calendar className="text-primary mb-3" size={24} />
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Departure
                </p>
                <p className="text-sm font-bold text-secondary dark:text-white uppercase italic">
                  {new Date(nextBooking.bookingDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-white/5 rounded-3xl">
                <MapPin className="text-primary mb-3" size={24} />
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Destination
                </p>
                <p className="text-sm font-bold text-secondary dark:text-white uppercase italic">
                  {(nextPackage?.relatedDestination as { name?: string })?.name || 'Global'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href={`/dashboard/trips`}>
                  <Button className="w-full bg-secondary text-white hover:bg-black border-none text-xs uppercase tracking-widest h-12">
                    View Itinerary
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="lg:col-span-3 flex justify-end">
              <Link href="/packages">
                <Button className="bg-secondary text-white px-10 h-14 rounded-2xl group border-none shadow-lg hover:shadow-primary/20 transition-all">
                  Browse Collections
                  <ArrowUpRight className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
