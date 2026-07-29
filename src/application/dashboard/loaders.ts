import { getDomainServices } from '@/domains/factory'
import type { BookingAggregate } from '@/domains/booking/types'
import type { CustomerPortalOverviewDTO, CustomerNotificationItemDTO } from './dto'

export class CustomerPortalLoader {
  static async loadOverview(
    customerId: number = 1,
    options?: { locale?: string; currency?: string },
  ): Promise<CustomerPortalOverviewDTO> {
    try {
      const { dashboard, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
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

      const currentTier = (projection?.loyalty?.tier || 'explorer').toLowerCase()
      const pts = projection?.loyalty?.pointsBalance || 0
      let pointsToNextTier = 0
      let nextTierName = 'Elite'

      if (currentTier === 'explorer') {
        pointsToNextTier = Math.max(0, 1000 - pts)
        nextTierName = 'Voyager'
      } else if (currentTier === 'voyager') {
        pointsToNextTier = Math.max(0, 5000 - pts)
        nextTierName = 'Elite'
      } else {
        pointsToNextTier = 0
        nextTierName = 'Elite (Max Tier)'
      }

      return {
        customerId,
        fullName: rawTitle,
        email: projection?.customer?.email || '',
        tier: (currentTier as 'explorer' | 'voyager' | 'elite'),
        points: pts,
        nextTierProgressPercent: projection?.loyalty?.tierProgressPercentage || 0,
        pointsToNextTier,
        nextTierName,
        activeBookingsCount: projection?.trips?.activeBookingsCount || 0,
        recentBookings,
        unreadNotificationsCount: 0,
      }
    } catch (err) {
      console.error(`[CustomerPortalLoader] Failed loading overview for customer #${customerId}:`, err)
      return {
        customerId,
        fullName: '',
        email: '',
        tier: 'explorer',
        points: 0,
        nextTierProgressPercent: 0,
        pointsToNextTier: 1000,
        nextTierName: 'Voyager',
        activeBookingsCount: 0,
        recentBookings: [],
        unreadNotificationsCount: 0,
      }
    }
  }

  static async loadNotifications(customerId: number): Promise<CustomerNotificationItemDTO[]> {
    try {
      const { notification, customer } = await getDomainServices()
      const cust = await customer.getById(customerId).catch(() => null)
      if (!cust || !cust.email) return []

      const repo = (notification as any).workflowEngine?.repository
      if (!repo || typeof repo.findByRecipient !== 'function') return []

      const logs = await repo.findByRecipient(cust.email, 20)
      return logs.map((log: any) => {
        let title = 'System Notification'
        let text = `Notification regarding ${log.referenceType} #${log.referenceId}`

        if (log.templateId === 'booking_confirmation') {
          title = 'Booking Confirmation'
          text = `Your booking ${log.templateData?.bookingNumber || ''} has been confirmed.`
        } else if (log.templateId === 'payment_receipt') {
          title = 'Payment Receipt'
          text = `Payment of ${log.templateData?.amount || ''} ${log.templateData?.currency || ''} received.`
        } else if (log.templateId === 'welcome_email') {
          title = 'Welcome to L\'Aube Voyage'
          text = `Welcome ${log.templateData?.name || ''}! We are glad to have you.`
        } else if (log.templateId === 'tier_upgraded') {
          title = 'Membership Tier Upgraded'
          text = `Congratulations! You have been upgraded to ${log.templateData?.newTier || 'Elite'}.`
        }

        return {
          id: log.jobId,
          title,
          text,
          time: new Date(log.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          unread: log.status === 'queued' || log.status === 'processing',
          templateId: log.templateId,
        }
      })
    } catch (err) {
      console.error(`[CustomerPortalLoader] Failed loading notifications for customer #${customerId}:`, err)
      return []
    }
  }
}

export class BookingDetailsLoader {
  static async loadByNumber(bookingNumber: string, options?: { locale?: string; currency?: string }) {
    try {
      const { booking, experience, localization, loyalty } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const bookingDoc = await booking.getByBookingNumber(bookingNumber)
      if (!bookingDoc) {
        console.warn(`[BookingDetailsLoader] Booking #${bookingNumber} not found.`)
        return null
      }

      const snapshot = bookingDoc.pricingSnapshot
      if (!snapshot) {
        throw new Error(`[BookingDetailsLoader] Booking #${bookingNumber} is missing pricingSnapshot.`)
      }

      const totalEGP = snapshot.totalAmountEGP || snapshot.subtotalEGP || snapshot.basePriceEGP || 0
      const formattedTotal = await localization.formatPrice(totalEGP, ctx)

      let experienceTitle = `Experience #${bookingDoc.experienceId}`
      try {
        const exp = await experience.getById(bookingDoc.experienceId)
        if (exp && exp.title) {
          experienceTitle = exp.title
        }
      } catch (expErr) {
        console.error(`[BookingDetailsLoader] Failed to load experience #${bookingDoc.experienceId}:`, expErr)
      }

      const rate = snapshot.exchangeRate || 1
      const rateText = `1 EGP = ${rate} ${snapshot.displayCurrency || 'EGP'}`

      // Single Source of Truth: Retrieve earned points directly from immutable point-ledger
      let pointsEarned = 0
      try {
        const ledgerEntries = await loyalty.getCustomerLedgerHistory(bookingDoc.customerId, 50)
        const earnEntry = ledgerEntries.find((e) => e.bookingId === bookingDoc.id && e.type === 'earn')
        if (earnEntry) pointsEarned = earnEntry.points
      } catch (ledgerErr) {
        console.error(`[BookingDetailsLoader] Failed to load point ledger for customer #${bookingDoc.customerId}:`, ledgerErr)
      }

      return {
        bookingNumber: bookingDoc.bookingNumber,
        experienceTitle,
        departureDate: bookingDoc.startDate,
        passengersCount: bookingDoc.travelers?.length || 1,
        basePriceText: `${(snapshot.basePriceEGP || 0).toLocaleString()} EGP`,
        exchangeRateText: rateText,
        totalCost: formattedTotal,
        pointsEarned,
        status: bookingDoc.status,
      }
    } catch (err) {
      console.error(`[BookingDetailsLoader] Error loading booking #${bookingNumber}:`, err)
      return null
    }
  }
}
