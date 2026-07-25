import { getDomainServices } from '@/domains/factory'
import type { BookingAggregate } from '@/domains/booking/types'
import type { CustomerPortalOverviewDTO } from './dto'

export class CustomerPortalLoader {
  static async loadOverview(
    customerId: number = 1,
    options?: { locale?: string; currency?: string },
  ): Promise<CustomerPortalOverviewDTO> {
    try {
      const { dashboard, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const projection = await dashboard.getPortalOverview(customerId)
      const rawTitle = projection?.customer?.fullName || ''
      const { booking, experience } = await getDomainServices()

      // Fetch user's actual bookings
      const bookingsResult = await booking.getUserBookings(customerId, 1, 5)
      
      const recentBookings = await Promise.all(
        (bookingsResult.data || []).map(async (b: BookingAggregate) => {
          const totalCostEGP = b.pricingSnapshot?.subtotalEGP || b.pricingSnapshot?.basePriceEGP || 0
          const formattedCost = await localization.formatPrice(totalCostEGP, ctx)

          let experienceTitle = `Trip #${b.bookingNumber}`
          let experienceImage = '/images/hero-bg.jpg'

          try {
            const exp = await experience.getById(b.experienceId)
            if (exp) {
              experienceTitle = exp.title || experienceTitle
              experienceImage = (exp as any).heroUrl || (exp as any).featuredImage?.url || experienceImage
            }
          } catch (e) {
            console.error('Failed fetching experience title for dashboard', e)
          }

          return {
            id: b.id,
            reference: b.bookingNumber,
            experienceTitle,
            experienceImage,
            departureDate: b.startDate,
            status: b.status as any,
            passengersCount: b.travelers.length || 1,
            totalCost: formattedCost,
          }
        })
      )

      return {
        customerId,
        fullName: rawTitle,
        email: projection?.customer?.email || '',
        tier: (projection?.loyalty?.tier || 'explorer') as 'explorer' | 'voyager' | 'elite',
        points: projection?.loyalty?.pointsBalance || 0,
        nextTierProgressPercent: projection?.loyalty?.tierProgressPercentage || 0,
        activeBookingsCount: projection?.trips?.activeBookingsCount || 0,
        recentBookings,
        unreadNotificationsCount: 0,
      }
    } catch {
      return {
        customerId,
        fullName: '',
        email: '',
        tier: 'explorer',
        points: 0,
        nextTierProgressPercent: 0,
        activeBookingsCount: 0,
        recentBookings: [],
        unreadNotificationsCount: 0,
      }
    }
  }
}

export class BookingDetailsLoader {
  static async loadByNumber(bookingNumber: string, options?: { locale?: string; currency?: string }) {
    try {
      const { booking, experience, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const bookingDoc = await booking.getByBookingNumber(bookingNumber)
      if (!bookingDoc) {
        // Fallback mockup prepared entirely on the server
        const baseEGP = 15000
        const totalEGP = 15000 * 2
        const formattedTotal = await localization.formatPrice(totalEGP, ctx)

        return {
          bookingNumber,
          experienceTitle: "Cairo & Pyramids 3-Day Luxury Package",
          departureDate: "Oct 15, 2026",
          passengersCount: 2,
          basePriceText: "15,000 EGP",
          exchangeRateText: "1 EGP = 0.02 USD",
          totalCost: formattedTotal,
          pointsEarned: 150,
          status: "confirmed",
        }
      }

      const totalEGP = bookingDoc.pricingSnapshot?.subtotalEGP || bookingDoc.pricingSnapshot?.basePriceEGP || 0
      const formattedTotal = await localization.formatPrice(totalEGP, ctx)

      let experienceTitle = "Cairo & Pyramids 3-Day Luxury Package"
      try {
        const exp = await experience.getById(bookingDoc.experienceId)
        if (exp) {
          experienceTitle = exp.title
        }
      } catch {}

      const rate = bookingDoc.pricingSnapshot?.exchangeRate || 1
      const rateText = `1 EGP = ${rate} ${bookingDoc.pricingSnapshot?.displayCurrency || 'EGP'}`

      return {
        bookingNumber: bookingDoc.bookingNumber,
        experienceTitle,
        departureDate: bookingDoc.startDate,
        passengersCount: bookingDoc.travelers?.length || 1,
        basePriceText: `${bookingDoc.pricingSnapshot?.basePriceEGP?.toLocaleString() || '15,000'} EGP`,
        exchangeRateText: rateText,
        totalCost: formattedTotal,
        pointsEarned: bookingDoc.pointsEarned || 0,
        status: bookingDoc.status,
      }
    } catch {
      return null;
    }
  }
}
