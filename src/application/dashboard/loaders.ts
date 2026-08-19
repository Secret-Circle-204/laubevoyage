import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { BookingAggregate } from '@/domains/booking/types'
import type {
  CustomerPortalOverviewDTO,
  CustomerNotificationsPortalDTO,
  CustomerSidebarDTO,
  CustomerBookingsHistoryDTO,
} from './dto'
import { LoyaltyTier } from '@/types'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'

export class CustomerPortalLoader {
  static async loadSidebar(customerId: number): Promise<CustomerSidebarDTO> {
    try {
      const { customer, dashboard } = await getDomainServices()
      const [customerDoc, projection] = await Promise.all([
        customer.getById(customerId),
        dashboard.getPortalOverview(customerId),
      ])

      const fullName = customerDoc?.fullName || projection?.customer?.fullName || 'Traveler'
      const currentTier = (
        projection?.loyalty?.tier ||
        customerDoc?.loyalty?.tier ||
        ''
      ).toLowerCase() as LoyaltyTier

      return {
        customerId,
        fullName,
        currentTier,
      }
    } catch (err) {
      console.error(
        `[CustomerPortalLoader] Failed loading sidebar for customer #${customerId}:`,
        err,
      )
      throw err
    }
  }

  static async loadOverview(
    customerId: number,
    options?: { locale?: string; currency?: string },
  ): Promise<CustomerPortalOverviewDTO> {
    try {
      const {
        dashboard,
        localization,
        customer: customerService,
        booking,
        experience,
        loyalty: loyaltyService,
        currency: currencyService,
        pricingFacade,
      } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const [projection, customerDoc] = await Promise.all([
        dashboard.getPortalOverview(customerId),
        customerService.getById(customerId),
      ])
      const notifsPortal = await CustomerPortalLoader.loadNotifications(customerId, {
        customerEmail: customerDoc?.email,
        page: 1,
        limit: 5,
      })
      const notifications = notifsPortal.notifications
      const rawTitle = customerDoc?.fullName || projection?.customer?.fullName || ''

      // Fetch user's actual bookings
      const bookingsResult = await booking.getUserBookings(customerId, 1, 5)
      const userBookings = bookingsResult.data || []

      // Batch resolution of experiences (Single Query - Eliminates N+1)
      const uniqueExperienceIds = Array.from(new Set(userBookings.map((b) => b.experienceId)))
      const experiences =
        uniqueExperienceIds.length > 0 ? await experience.getManyByIds(uniqueExperienceIds) : []
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      const recentBookings = await Promise.all(
        userBookings.map(async (b: BookingAggregate) => {
          const snap = b.pricingSnapshot
          let formattedCost: any
          if (snap && snap.displayAmount !== undefined && snap.displayCurrency) {
            formattedCost = await localization.formatAlreadyConvertedPrice(
              snap.displayAmount,
              snap.totalAmountEGP || snap.basePriceEGP,
              snap.displayCurrency,
              snap.exchangeRate || 1,
              ctx,
            )
          } else {
            const totalCostEGP = snap?.totalAmountEGP || snap?.basePriceEGP || 0
            formattedCost = await localization.formatPrice(totalCostEGP, ctx)
          }

          const exp = experiencesMap.get(b.experienceId)
          const experienceTitle = exp?.title || `Trip #${b.bookingNumber}`
          const experienceImage =
            (exp as any)?.heroUrl || (exp as any)?.featuredImage?.url || '/images/hero-bg.jpg'

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
        }),
      )

      const loyaltyConfig = await loyaltyService.getActiveConfig()
      const orderedTiers = TierPolicy.getOrderedTiers(loyaltyConfig)
      const defaultTier = orderedTiers[0].tier

      const currentTier = (projection?.loyalty?.tier || defaultTier).toLowerCase()
      const pts = projection?.loyalty?.pointsBalance || 0
      const totalSpentEGP = projection?.loyalty?.totalSpentEGP ?? 0

      // Delegate all tier progress calculation and formatting to the unified factory
      const progressPresentation = await LoyaltyProgressDTOFactory.build(
        totalSpentEGP,
        currentTier as LoyaltyTier,
        loyaltyConfig,
        localization,
        ctx,
      )

      // Delegate points monetary valuation & multi-currency calculation to the unified factory
      const valuationPresentation = await LoyaltyProgressDTOFactory.buildValuation(
        pts,
        loyaltyService,
        loyaltyConfig,
        currencyService,
        pricingFacade,
        localization,
        ctx,
      )

      const formattedPoints = localization.formatNumber(pts, ctx)
      const formattedTotalSpentPrice = await localization.formatPrice(totalSpentEGP, ctx)

      const tierThresholdsArray = loyaltyService.getTierThresholds(loyaltyConfig)
      const tierThresholds = await Promise.all(
        tierThresholdsArray.map(async (t) => {
          const formatted = await localization.formatPrice(t.minSpentEGP, ctx)
          return {
            tier: t.tier,
            minSpentEGP: t.minSpentEGP,
            formattedMinSpent: formatted.formatted,
          }
        }),
      )

      // Convert EGP redemption value using context display currency and format it
      const formattedRedemption = await localization.formatPrice(
        loyaltyConfig.redemptionValueEGP,
        ctx,
      )

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
        currentTier: currentTier as LoyaltyTier,
        points: pts,
        formattedPoints,
        pointsMonetaryValue: valuationPresentation.pointsMonetaryValue,
        pointsValuesAllCurrencies: valuationPresentation.pointsValuesAllCurrencies,
        pointsValueGuide: valuationPresentation.pointsValueGuide,
        nextTierProgressPercent: progressPresentation.nextTierProgressPercent,
        totalSpentEGP,
        formattedTotalSpentEGP: formattedTotalSpentPrice.formatted,
        remainingQualifyingSpendEGP: progressPresentation.remainingQualifyingSpendEGP,
        formattedRemainingQualifyingSpend: progressPresentation.formattedRemainingQualifyingSpend,
        nextTierName: progressPresentation.nextTierName,
        activeBookingsCount: projection?.trips?.activeBookingsCount || 0,
        recentBookings,
        unreadNotificationsCount: notifications.filter((n) => n.unread).length,
        passportNumber: customerDoc?.passportNumber || undefined,
        nationality: customerDoc?.nationality || undefined,
        tierThresholds,
        redemptionRate,
      }
    } catch (err) {
      console.error(
        `[CustomerPortalLoader] Failed loading overview for customer #${customerId}:`,
        err,
      )
      throw err
    }
  }

  static async loadBookingsHistory(
    customerId: number,
    options?: {
      locale?: string
      currency?: string
      page?: number
      limit?: number
      status?: string
    },
  ): Promise<CustomerBookingsHistoryDTO> {
    try {
      const { booking, experience, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      // Strict Bounded Limits: Page >= 1, Limit clamped between 1 and 20 (default 10)
      const page = Math.max(1, Number(options?.page) || 1)
      const limit = Math.min(20, Math.max(1, Number(options?.limit) || 10))
      const statusFilter = options?.status ? (options.status.toLowerCase() as any) : undefined

      const bookingsResult = await booking.getUserBookings(
        customerId,
        page,
        limit,
        statusFilter ? { status: statusFilter } : undefined,
      )
      const userBookings = bookingsResult.data || []

      // Batch resolution of experiences (Single Query - Eliminates N+1)
      const uniqueExperienceIds = Array.from(new Set(userBookings.map((b) => b.experienceId)))
      const experiences =
        uniqueExperienceIds.length > 0 ? await experience.getManyByIds(uniqueExperienceIds) : []
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      const bookings = await Promise.all(
        userBookings.map(async (b: BookingAggregate) => {
          const snapshot = b.pricingSnapshot
          let formattedCost
          if (snapshot && snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
            formattedCost = await localization.formatAlreadyConvertedPrice(
              snapshot.displayAmount,
              snapshot.totalAmountEGP,
              snapshot.displayCurrency,
              snapshot.exchangeRate || 1,
              ctx,
            )
          } else {
            const totalCostEGP =
              snapshot?.totalAmountEGP || snapshot?.subtotalEGP || snapshot?.basePriceEGP || 0
            formattedCost = await localization.formatPrice(totalCostEGP, ctx)
          }

          const exp = experiencesMap.get(b.experienceId)
          const experienceTitle = exp?.title || `Trip #${b.bookingNumber}`
          const experienceImage =
            (exp as any)?.heroUrl || (exp as any)?.featuredImage?.url || '/images/hero-bg.jpg'

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
        }),
      )

      const total = bookingsResult.total || bookings.length
      const totalPages = bookingsResult.totalPages || Math.ceil(total / limit) || 1

      return {
        bookings,
        total,
        page: bookingsResult.page || page,
        totalPages,
        limit,
        currentStatus: options?.status,
      }
    } catch (err) {
      console.error(
        `[CustomerPortalLoader] Failed loading bookings history for customer #${customerId}:`,
        err,
      )
      throw err
    }
  }

  static async loadNotifications(
    customerId: number,
    options?: { customerEmail?: string; page?: number; limit?: number; category?: string },
  ): Promise<CustomerNotificationsPortalDTO> {
    try {
      const { notification, customer } = await getDomainServices()
      let email = options?.customerEmail
      if (!email) {
        const cust = await customer.getById(customerId)
        email = cust?.email
      }
      if (!email) {
        return {
          notifications: [],
          total: 0,
          page: 1,
          totalPages: 1,
          limit: 20,
        }
      }

      // Strict Bounded Limits: Page >= 1, Limit clamped between 1 and 50 (default 20)
      const page = Math.max(1, Number(options?.page) || 1)
      const limit = Math.min(50, Math.max(1, Number(options?.limit) || 20))

      // Strict Application Boundary Validation for category filter
      const allowedCategories: string[] = ['marketing', 'booking', 'payment', 'loyalty']
      let validCategory: any = undefined
      if (options?.category) {
        const cat = options.category.toLowerCase().trim()
        if (allowedCategories.includes(cat)) {
          validCategory = cat
        }
      }

      const result = await notification.getNotificationsByRecipient(
        email,
        page,
        limit,
        validCategory ? { category: validCategory } : undefined,
      )

      const notifications = result.data.map((log: any) => {
        let title = 'System Notification'
        let text = `Notification regarding ${log.referenceType} #${log.referenceId}`

        if (log.templateId === 'booking_confirmation') {
          title = 'Booking Confirmation'
          text = `Your booking ${log.templateData?.bookingNumber || ''} has been confirmed.`
        } else if (log.templateId === 'payment_receipt') {
          title = 'Payment Receipt'
          text = `Payment of ${log.templateData?.amount || ''} ${log.templateData?.currency || ''} received.`
        } else if (log.templateId === 'welcome_email') {
          title = "Welcome to L'Aube Voyage"
          text = `Welcome ${log.templateData?.name || ''}! We are glad to have you.`
        } else if (log.templateId === 'tier_upgraded') {
          title = 'Membership Tier Upgraded'
          text = `Congratulations! You have been upgraded to ${log.templateData?.newTier || 'new tier'}.`
        } else if (log.templateId === 'loyalty_earned') {
          title = 'Loyalty Points Earned'
          text = `You earned ${log.templateData?.points || 0} loyalty points! Your current balance is ${log.templateData?.balance || 0} points.`
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
          category: log.category,
          unread: log.status === 'queued' || log.status === 'processing',
          templateId: log.templateId,
        }
      })

      return {
        notifications,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit,
        currentCategory: validCategory,
      }
    } catch (err) {
      console.error(
        `[CustomerPortalLoader] Failed loading notifications for customer #${customerId}:`,
        err,
      )
      throw err
    }
  }
}

export class BookingDetailsLoader {
  static async loadByNumber(
    bookingNumber: string,
    customerIdOrOptions?: number | { locale?: string; currency?: string },
    options?: { locale?: string; currency?: string },
  ) {
    try {
      const customerId = typeof customerIdOrOptions === 'number' ? customerIdOrOptions : undefined
      const resolvedOptions =
        typeof customerIdOrOptions === 'object' ? customerIdOrOptions : options

      const { booking, experience, localization, loyalty } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: resolvedOptions?.locale,
        cookieCurrency: resolvedOptions?.currency,
      })

      const bookingDoc = await booking.getByBookingNumber(bookingNumber, customerId)
      if (!bookingDoc) {
        console.warn(
          `[BookingDetailsLoader] Booking #${bookingNumber} not found or tenant unauthorized.`,
        )
        return null
      }

      const snapshot = bookingDoc.pricingSnapshot
      if (!snapshot) {
        throw new Error(
          `[BookingDetailsLoader] Booking #${bookingNumber} is missing pricingSnapshot.`,
        )
      }

      let formattedTotal: any
      if (snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
        formattedTotal = await localization.formatAlreadyConvertedPrice(
          snapshot.displayAmount,
          snapshot.totalAmountEGP || snapshot.basePriceEGP,
          snapshot.displayCurrency,
          snapshot.exchangeRate || 1,
          ctx,
        )
      } else {
        const totalEGP =
          snapshot.totalAmountEGP || snapshot.subtotalEGP || snapshot.basePriceEGP || 0
        formattedTotal = await localization.formatPrice(totalEGP, ctx)
      }

      let experienceTitle = `Experience #${bookingDoc.experienceId}`
      const exp = await experience.getById(bookingDoc.experienceId)
      if (exp && exp.title) {
        experienceTitle = exp.title
      }

      const rate = snapshot.exchangeRate || 1
      const rateText = `1 EGP = ${rate} ${snapshot.displayCurrency || 'EGP'}`

      // Single Source of Truth: Retrieve earned points directly from immutable point-ledger for this specific booking
      let pointsEarned = 0
      const bookingLedgerEntries = await loyalty.getBookingLedgerEntries(bookingDoc.id)
      const earnEntry = bookingLedgerEntries.find((e) => e.type === 'earn')
      if (earnEntry) pointsEarned = earnEntry.points

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
