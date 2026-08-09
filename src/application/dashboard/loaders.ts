import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { BookingAggregate } from '@/domains/booking/types'
import type { CustomerPortalOverviewDTO, CustomerNotificationItemDTO } from './dto'
import { LoyaltyTier } from '@/types'

export class CustomerPortalLoader {
  static async loadOverview(
    customerId: number,
    options?: { locale?: string; currency?: string },
  ): Promise<CustomerPortalOverviewDTO> {
    try {
      const { dashboard, localization, customer: customerService, booking, experience, loyalty: loyaltyService } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const [projection, customerDoc, notifications] = await Promise.all([
        dashboard.getPortalOverview(customerId),
        customerService.getById(customerId).catch(() => null),
        CustomerPortalLoader.loadNotifications(customerId),
      ])
      const rawTitle = customerDoc?.fullName || projection?.customer?.fullName || ''

      // Fetch user's actual bookings
      const bookingsResult = await booking.getUserBookings(customerId, 1, 5)
      
      const recentBookings = await Promise.all(
        (bookingsResult.data || []).map(async (b: BookingAggregate) => {
          const snap = b.pricingSnapshot
          let formattedCost: any
          if (snap && snap.displayAmount !== undefined && snap.displayCurrency) {
            formattedCost = await localization.formatAlreadyConvertedPrice(
              snap.displayAmount,
              snap.totalAmountEGP || snap.basePriceEGP,
              snap.displayCurrency,
              snap.exchangeRate || 1,
              ctx
            )
          } else {
            const totalCostEGP = snap?.totalAmountEGP || snap?.basePriceEGP || 0
            formattedCost = await localization.formatPrice(totalCostEGP, ctx)
          }

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

      const loyaltyConfig = await loyaltyService.getActiveConfig()
      const currentSpentEGP = projection?.loyalty?.totalSpentEGP || 0
      
      // Calculate dynamic progression in EGP Qualifying Spend (Domain Method)
      const tierProgress = loyaltyService.calculateTierProgress(
        currentSpentEGP,
        currentTier as LoyaltyTier,
        loyaltyConfig
      )
      
      const tierThresholdsArray = loyaltyService.getTierThresholds(loyaltyConfig)
      
      const formattedRemaining = tierProgress.remainingQualifyingSpendEGP !== null
        ? await localization.formatPrice(tierProgress.remainingQualifyingSpendEGP, ctx)
        : null
      const formattedRemainingQualifyingSpend = formattedRemaining ? formattedRemaining.formatted : null

      const nextTierName = tierProgress.nextTier ? tierProgress.nextTier : 'Elite (Max Tier)'
      const nextTierTranslated = tierProgress.nextTier
        ? await localization.translateText(tierProgress.nextTier, ctx)
        : ''

      const formattedPoints = localization.formatNumber(pts, ctx)

      const tierThresholds = await Promise.all(
        tierThresholdsArray.map(async (t) => {
          const formatted = await localization.formatPrice(t.minSpentEGP, ctx)
          return {
            tier: t.tier,
            minSpentEGP: t.minSpentEGP,
            formattedMinSpent: formatted.formatted,
          }
        })
      )

      // Convert EGP redemption value using context display currency and format it
      const formattedRedemption = await localization.formatPrice(loyaltyConfig.redemptionValueEGP, ctx)

      const redemptionRate = {
        pointsUnit: loyaltyConfig.redemptionPointsUnit,
        baseValue: loyaltyConfig.redemptionValueEGP,
        baseCurrency: 'EGP',
        displayValue: formattedRedemption.formatted,
      }

      return {
        customerId,
        fullName: rawTitle,
        email: projection?.customer?.email || '',
        currentTier: (currentTier as 'explorer' | 'voyager' | 'elite'),
        points: pts,
        formattedPoints,
        nextTierProgressPercent: projection?.loyalty?.tierProgressPercentage || 0,
        currentQualifyingSpendEGP: currentSpentEGP,
        remainingQualifyingSpendEGP: tierProgress.remainingQualifyingSpendEGP,
        formattedRemainingQualifyingSpend,
        nextTierName: nextTierTranslated,
        activeBookingsCount: projection?.trips?.activeBookingsCount || 0,
        recentBookings,
        unreadNotificationsCount: notifications.filter((n) => n.unread).length,
        passportNumber: customerDoc?.passportNumber || undefined,
        nationality: customerDoc?.nationality || undefined,
        tierThresholds,
        redemptionRate,
      }
    } catch (err) {
      console.error(`[CustomerPortalLoader] Failed loading overview for customer #${customerId}:`, err)
      throw err
    }
  }

  static async loadBookingsHistory(
    customerId: number,
    options?: { locale?: string; currency?: string; page?: number; limit?: number },
  ) {
    try {
      const { booking, experience, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const page = options?.page || 1
      const limit = options?.limit || 100

      const bookingsResult = await booking.getUserBookings(customerId, page, limit)
      
      const bookings = await Promise.all(
        (bookingsResult.data || []).map(async (b: BookingAggregate) => {
          const snapshot = b.pricingSnapshot
          let formattedCost
          if (snapshot && snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
            formattedCost = await localization.formatAlreadyConvertedPrice(
              snapshot.displayAmount,
              snapshot.totalAmountEGP,
              snapshot.displayCurrency,
              snapshot.exchangeRate || 1,
              ctx
            )
          } else {
            const totalCostEGP = snapshot?.totalAmountEGP || snapshot?.subtotalEGP || snapshot?.basePriceEGP || 0
            formattedCost = await localization.formatPrice(totalCostEGP, ctx)
          }

          let experienceTitle = `Trip #${b.bookingNumber}`
          let experienceImage = '/images/hero-bg.jpg'

          try {
            const exp = await experience.getById(b.experienceId)
            if (exp) {
              experienceTitle = exp.title || experienceTitle
              experienceImage = (exp as any).heroUrl || (exp as any).featuredImage?.url || experienceImage
            }
          } catch (e) {
            console.error('Failed fetching experience title for history', e)
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
        bookings,
        total: bookingsResult.total || bookings.length,
      }
    } catch (err) {
      console.error(`[CustomerPortalLoader] Failed loading bookings history for customer #${customerId}:`, err)
      throw err
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
      throw err
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

      let formattedTotal: any
      if (snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
        formattedTotal = await localization.formatAlreadyConvertedPrice(
          snapshot.displayAmount,
          snapshot.totalAmountEGP || snapshot.basePriceEGP,
          snapshot.displayCurrency,
          snapshot.exchangeRate || 1,
          ctx
        )
      } else {
        const totalEGP = snapshot.totalAmountEGP || snapshot.subtotalEGP || snapshot.basePriceEGP || 0
        formattedTotal = await localization.formatPrice(totalEGP, ctx)
      }

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
      throw err
    }
  }
}
