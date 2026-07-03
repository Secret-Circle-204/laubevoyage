import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Star, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Package, Excursion } from '@/payload-types'
import ReviewModal from '@/components/dashboard/ReviewModal'
/**
 * صفحة التقييمات - تعرض الرحلات المكتملة للمستخدم
 * Dashboard Reviews Page - Shows completed trips for user to review
 */
export default async function ReviewsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) return null

  // جلب الحجوزات المكتملة فقط
  const completedBookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [{ user: { equals: user.id } }, { status: { equals: 'completed' } }],
    },
    sort: '-bookingDate',
    depth: 2,
  })

  // جلب التقييمات السابقة للمستخدم
  const userReviews = await payload.find({
    collection: 'reviews',
    where: {
      user: { equals: user.id },
    },
    depth: 1,
  })

  const reviewedExcursionIds = new Set(
    userReviews.docs
      .map((r) => {
        const exc = r.excursion as Excursion | undefined
        return exc?.id
      })
      .filter(Boolean),
  )

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={14} />
      case 'rejected':
        return <XCircle size={14} />
      default:
        return <Clock size={14} />
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter uppercase italic">
          My Reviews
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">
          Share your experiences and inspire fellow travelers.
        </p>
      </div>

      {/* التقييمات السابقة */}
      {userReviews.docs.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-stone-600 dark:text-stone-300 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Your Reviews
          </h2>
          <div className="grid gap-4">
            {userReviews.docs.map((review) => {
              const exc = review.excursion as Excursion | undefined
              return (
                <div
                  key={review.id}
                  className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-stone-100 dark:border-white/10"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-stone-800 dark:text-white">
                        {exc?.title || 'Excursion'}
                      </h3>
                      <p className="text-sm text-stone-500 mt-1">{review.title}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < (review.rating || 0)
                                ? 'text-primary fill-primary'
                                : 'text-stone-300'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${getStatusStyle(review.status || 'pending')}`}
                    >
                      {getStatusIcon(review.status || 'pending')}
                      {review.status || 'pending'}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-4 line-clamp-2">
                      {review.comment}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* الرحلات المكتملة التي يمكن تقييمها */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-stone-600 dark:text-stone-300 uppercase tracking-widest flex items-center gap-2">
          <Star size={18} className="text-primary" />
          Ready to Review
        </h2>

        {completedBookings.docs.length > 0 ? (
          <div className="grid gap-6">
            {completedBookings.docs.map((booking) => {
              const pkg = booking.package as Package | undefined
              const excursions = (booking.selectedExcursions || []) as Excursion[]
              const heroImageUrl =
                typeof pkg?.heroImage === 'object' && pkg?.heroImage ? pkg.heroImage.url : undefined

              return (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-white/5 rounded-[24px] overflow-hidden border border-stone-100 dark:border-white/10"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 relative h-48 md:h-auto min-h-[180px]">
                      <Image
                        src={heroImageUrl || '/destinations/paris-hero.jpg'}
                        alt={pkg?.title || 'Trip'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="md:w-3/4 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-serif font-bold text-secondary dark:text-white italic">
                            {pkg?.title}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {excursions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                            Rate your experiences:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {excursions.map((exc) => {
                              const isReviewed = reviewedExcursionIds.has(exc.id)
                              return (
                                <ReviewModal
                                  key={exc.id}
                                  excursion={exc}
                                  userId={user.id}
                                  isReviewed={isReviewed}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {excursions.length === 0 && (
                        <p className="text-sm text-stone-400 italic">
                          No excursions to review for this trip.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-white/5 rounded-[32px] border border-stone-100 dark:border-white/10">
            <Star size={48} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
            <p className="text-stone-500 dark:text-stone-400">
              Complete a trip to unlock the ability to leave reviews.
            </p>
            <Link
              href="/packages"
              className="inline-block mt-4 text-primary font-bold text-sm hover:underline"
            >
              Explore Packages →
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
