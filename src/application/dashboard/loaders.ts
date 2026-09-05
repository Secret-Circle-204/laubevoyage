import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { BookingAggregate, BookingUserFilter } from '@/domains/booking/types'
import type { ConvertedPrice } from '@/domains/currency/types'
import { PaymentAttemptsService } from '@/domains/booking/payment-attempts'
import type {
  CustomerPortalOverviewDTO,
  CustomerNotificationsPortalDTO,
  CustomerSidebarDTO,
  CustomerBookingsHistoryDTO,
  BookingDetailsDTO,
  BookingTravelerDTO,
  BookingStaySnapshotDTO,
  BookingRoomAllocationDTO,
} from './dto'
import { BookingLoyaltySummaryAssembler } from '@/application/loyalty/booking-summary-assembler'
import { LoyaltyTier, BookingStatus } from '@/types'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'

export class CustomerPortalLoader {
  static async loadSidebar(customerId: number, locale?: string): Promise<CustomerSidebarDTO> {
    try {
      const { customer, dashboard, localization } = await getDomainServices()
      const ctx = await localization.buildContext({ cookieLocale: locale })
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

      const navLinks = [
        { label: localization.translateUiKey('layout.sidebar.overview', ctx), href: '/dashboard', icon: '📊' },
        { label: localization.translateUiKey('layout.sidebar.myBookings', ctx), href: '/dashboard/bookings', icon: '🧳' },
        { label: localization.translateUiKey('layout.sidebar.loyaltyRewards', ctx), href: '/dashboard/loyalty', icon: '👑' },
        { label: localization.translateUiKey('layout.sidebar.profileCompanions', ctx), href: '/dashboard/profile', icon: '👤' },
        { label: localization.translateUiKey('layout.sidebar.invoicesReceipts', ctx), href: '/dashboard/invoices', icon: '🧾' },
        { label: localization.translateUiKey('layout.sidebar.notifications', ctx), href: '/dashboard/notifications', icon: '🔔' },
        { label: localization.translateUiKey('layout.sidebar.settings', ctx), href: '/dashboard/settings', icon: '⚙️' },
      ]

      const tierSuffix = localization.translateUiKey('layout.sidebar.tierSuffix', ctx)

      return {
        customerId,
        fullName,
        currentTier,
        navLinks,
        tierSuffix,
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
      const uniqueExperienceIds: number[] = Array.from(new Set(userBookings.map((b) => b.experienceId)))
      const experiences =
        uniqueExperienceIds.length > 0 ? await experience.getManyByIds(uniqueExperienceIds) : []
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      // Batch translate recent bookings experience titles
      const rawExpTitles: string[] = Array.from(
        new Set(
          userBookings
            .map((b) => experiencesMap.get(b.experienceId)?.title)
            .filter((t): t is string => Boolean(t)),
        ),
      )
      const translatedExpTitles = await localization.translateBatch(rawExpTitles, ctx)
      const expTitleMap = new Map<string, string>()
      rawExpTitles.forEach((raw, idx) => {
        expTitleMap.set(raw, translatedExpTitles[idx] || raw)
      })

      const recentBookings = await Promise.all(
        userBookings.map(async (b: BookingAggregate) => {
          const snap = b.pricingSnapshot
          let formattedCost: ConvertedPrice
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

          const paidEGP = b.amountPaid ?? 0
          const outstandingEGP = b.outstandingBalance ?? 0
          const rate = snap?.exchangeRate || 1

          let formattedPaid: ConvertedPrice | undefined
          let formattedOutstanding: ConvertedPrice | undefined

          if (snap && snap.displayAmount !== undefined && snap.displayCurrency) {
            formattedPaid = await localization.formatAlreadyConvertedPrice(
              paidEGP * rate,
              paidEGP,
              snap.displayCurrency,
              rate,
              ctx,
            )
            formattedOutstanding = await localization.formatAlreadyConvertedPrice(
              outstandingEGP * rate,
              outstandingEGP,
              snap.displayCurrency,
              rate,
              ctx,
            )
          } else {
            formattedPaid = await localization.formatPrice(paidEGP, ctx)
            formattedOutstanding = await localization.formatPrice(outstandingEGP, ctx)
          }

          const exp = experiencesMap.get(b.experienceId)
          const rawTitle = exp?.title
          const experienceTitle = rawTitle ? (expTitleMap.get(rawTitle) || rawTitle) : `Trip #${b.bookingNumber}`
          const experienceImage =
            (exp as any)?.heroUrl || (exp as any)?.featuredImage?.url || '/images/hero-bg.jpg'

          return {
            id: b.id,
            reference: b.bookingNumber,
            experienceTitle,
            experienceImage,
            departureDate: b.startDate,
            status: b.status,
            passengersCount: b.travelers.length || 1,
            totalCost: formattedCost,
            paymentStatus: b.paymentStatus,
            paidAmount: formattedPaid,
            outstandingBalance: formattedOutstanding,
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
      const { booking, experience, destination, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      // Strict Bounded Limits: Page >= 1, Limit clamped between 1 and 20 (default 10)
      const page = Math.max(1, Number(options?.page) || 1)
      const limit = Math.min(20, Math.max(1, Number(options?.limit) || 10))
      const rawStatus = options?.status ? options.status.toLowerCase().trim() : undefined

      let repoFilter: BookingUserFilter | undefined = undefined
      if (rawStatus === 'confirmed') {
        repoFilter = { status: BookingStatus.CONFIRMED }
      } else if (rawStatus === 'pending_payment') {
        repoFilter = { status: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_ADMIN_REVIEW] }
      } else if (rawStatus === 'completed') {
        repoFilter = { status: BookingStatus.COMPLETED }
      } else if (rawStatus === 'cancelled') {
        repoFilter = { status: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] }
      }

      // 1. Native Database Server-Side Pagination Query ($O(1) Memory)
      const bookingsResult = await booking.getUserBookings(
        customerId,
        page,
        limit,
        repoFilter,
      )
      const userBookings = bookingsResult.data || []
      const total = bookingsResult.total || 0
      const totalPages = bookingsResult.totalPages || 1

      if (userBookings.length === 0) {
        return {
          bookings: [],
          total,
          page,
          totalPages,
          limit,
          currentStatus: rawStatus,
        }
      }

      // 2. Batch-Resolve matching experiences (Single True Database Batch Query)
      const uniqueExperienceIds = Array.from(
        new Set(
          userBookings
            .map((b) => b.experienceId)
            .filter((id): id is number => typeof id === 'number'),
        ),
      )
      const experiences =
        uniqueExperienceIds.length > 0 ? await experience.getManyByIds(uniqueExperienceIds) : []
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      // 3. Batch-Resolve matching departure slots (Single True Database Batch Query)
      const uniqueSlotIds = Array.from(
        new Set(
          userBookings
            .map((b) => b.departureSlot)
            .filter((id): id is number => typeof id === 'number'),
        ),
      )
      const slotsList =
        uniqueSlotIds.length > 0 ? await experience.getDepartureSlotsByIds(uniqueSlotIds) : []
      const slotsMap = new Map(slotsList.map((s) => [Number(s.id), s]))

      // 4. Batch-Resolve matching cities from Destination Domain (Single True Database Batch Query)
      const uniqueCityIds = Array.from(
        new Set(
          Array.from(experiencesMap.values())
            .map((e) => e.cityId)
            .filter((id): id is number => typeof id === 'number' && id > 0),
        ),
      )
      const citiesList =
        uniqueCityIds.length > 0 ? await destination.getCitiesByIds(uniqueCityIds) : []
      const citiesMap = new Map(citiesList.map((c: any) => [Number(c.id), c]))

      // Batch translate all dynamic texts for bookings page (Single translation pass)
      const rawExpTitles = Array.from(
        new Set(
          userBookings
            .map((b) => experiencesMap.get(b.experienceId)?.title)
            .filter((t): t is string => Boolean(t)),
        ),
      )
      const rawGeoNames: string[] = []
      for (const cityDoc of Array.from(citiesMap.values())) {
        if (cityDoc.name) rawGeoNames.push(String(cityDoc.name))
        const countryObj = cityDoc.country
        if (countryObj && typeof countryObj === 'object' && 'name' in countryObj && countryObj.name) {
          rawGeoNames.push(String(countryObj.name))
        }
      }
      const uniqueGeoNames = Array.from(new Set(rawGeoNames.filter(Boolean)))
      const allDynamicTexts = [...rawExpTitles, ...uniqueGeoNames]
      const translatedDynamicTexts =
        typeof localization.translateBatch === 'function'
          ? await localization.translateBatch(allDynamicTexts, ctx)
          : allDynamicTexts
      const dynamicTextMap = new Map<string, string>()
      allDynamicTexts.forEach((text, i) => {
        dynamicTextMap.set(text, translatedDynamicTexts[i] || text)
      })

      const bookings = await Promise.all(
        userBookings.map(async (b: BookingAggregate) => {
          const snapshot = b.pricingSnapshot
          const exp = experiencesMap.get(b.experienceId)
          const isCancelled =
            b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REFUNDED
          const rate = snapshot?.exchangeRate || 1

          // Service / Product Type and Labels (Zero Invented Defaults)
          let productTypeLabel: string | undefined = undefined
          if (exp?.type) {
            productTypeLabel =
              exp.type === 'package'
                ? localization.translateUiKey('catalog.packageLabel', ctx)
                : localization.translateUiKey('catalog.dailyTourLabel', ctx)
          }

          // Authoritative Destination City Resolution via Destination Domain
          let destinationCity: string | undefined = undefined
          if (exp?.cityId && citiesMap.has(exp.cityId)) {
            const cityDoc = citiesMap.get(exp.cityId)
            if (cityDoc) {
              const rawCityName = String(cityDoc.name || '')
              const cityName = dynamicTextMap.get(rawCityName) || rawCityName
              const countryObj = cityDoc.country
              const rawCountryName =
                countryObj && typeof countryObj === 'object' && 'name' in countryObj && countryObj.name
                  ? String(countryObj.name)
                  : ''
              const countryName = dynamicTextMap.get(rawCountryName) || rawCountryName
              destinationCity =
                cityName && countryName ? `${cityName}, ${countryName}` : (cityName || countryName || undefined)
            }
          }

          // Duration (Zero Invented Defaults & Strict Singular/Plural Grammar)
          let durationText: string | undefined = undefined
          if (exp?.type === 'package' && exp.duration?.days) {
            const days = exp.duration.days
            const nights = exp.duration.nights
            const dayLabel = days === 1 ? '1 Day' : `${days} Days`
            if (nights !== undefined) {
              const nightLabel = nights === 1 ? '1 Night' : `${nights} Nights`
              durationText = `${dayLabel} / ${nightLabel}`
            } else {
              durationText = dayLabel
            }
          } else if (exp?.type === 'daily_tour' && exp.duration?.durationMinutes) {
            const mins = exp.duration.durationMinutes
            const hours = mins / 60
            if (Number.isInteger(hours)) {
              durationText = hours === 1 ? '1 Hour' : `${hours} Hours`
            } else {
              durationText = mins === 1 ? '1 Min' : `${mins} Mins`
            }
          }

          // Authoritative Departure Time Resolution (Slot Precedence > Schedule > Undefined)
          let departureTime: string | undefined = undefined
          if (b.departureSlot && slotsMap.has(b.departureSlot)) {
            departureTime = slotsMap.get(b.departureSlot)?.startTime || undefined
          } else if (exp?.schedules && exp.schedules.length > 0 && exp.schedules[0].startTime) {
            departureTime = exp.schedules[0].startTime || undefined
          }

          // Authoritative Operational Return/Completion Time Resolution (from persisted b.completionAt)
          // Strict SSOT: Only formatted if destinationTimezone is present. Zero synthetic fallback timezones.
          let returnTime: string | undefined = undefined
          if (b.completionAt && b.destinationTimezone) {
            try {
              const completionDate = new Date(b.completionAt)
              if (!isNaN(completionDate.getTime())) {
                returnTime = new Intl.DateTimeFormat('en-GB', {
                  timeZone: b.destinationTimezone,
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(completionDate)
              }
            } catch {
              returnTime = undefined
            }
          }

          let formattedCost: ConvertedPrice
          if (snapshot && snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
            formattedCost = await localization.formatAlreadyConvertedPrice(
              snapshot.displayAmount,
              snapshot.totalAmountEGP,
              snapshot.displayCurrency,
              rate,
              ctx,
            )
          } else {
            const totalCostEGP =
              snapshot?.totalAmountEGP || snapshot?.subtotalEGP || snapshot?.basePriceEGP || 0
            formattedCost = await localization.formatPrice(totalCostEGP, ctx)
          }

          const paidEGP = b.amountPaid ?? 0
          const outstandingEGP = isCancelled ? 0 : (b.outstandingBalance ?? 0)

          let formattedPaid: ConvertedPrice | undefined
          let formattedOutstanding: ConvertedPrice | undefined

          if (snapshot && snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
            formattedPaid = await localization.formatAlreadyConvertedPrice(
              paidEGP * rate,
              paidEGP,
              snapshot.displayCurrency,
              rate,
              ctx,
            )
            formattedOutstanding = await localization.formatAlreadyConvertedPrice(
              outstandingEGP * rate,
              outstandingEGP,
              snapshot.displayCurrency,
              rate,
              ctx,
            )
          } else {
            formattedPaid = await localization.formatPrice(paidEGP, ctx)
            formattedOutstanding = await localization.formatPrice(outstandingEGP, ctx)
          }

          const rawTitle = exp?.title
          const experienceTitle = rawTitle ? (dynamicTextMap.get(rawTitle) || rawTitle) : `Trip #${b.bookingNumber}`
          const experienceImage = exp?.heroUrl || '/images/hero-bg.jpg'

          return {
            id: b.id,
            reference: b.bookingNumber,
            experienceTitle,
            experienceImage,
            productTypeLabel,
            destinationCity,
            durationText,
            departureDate: b.startDate,
            departureTime,
            returnTime,
            endDate: b.endDate !== b.startDate ? b.endDate : undefined,
            destinationTimezone: b.destinationTimezone,
            status: b.status,
            passengersCount: b.travelers?.length || 1,
            totalCost: formattedCost,
            paymentStatus: b.paymentStatus,
            paidAmount: formattedPaid,
            outstandingBalance: formattedOutstanding,
            isCancelled,
          }
        }),
      )

      return {
        bookings,
        total,
        page,
        totalPages,
        limit,
        currentStatus: rawStatus,
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
        } else if (log.templateId === 'booking_pending_admin_review') {
          title = 'Booking Request Received'
          text = `Your booking request #${log.templateData?.bookingNumber || ''} has been received and is pending concierge review.`
        } else if (log.templateId === 'admin_bnpl_review_alert') {
          title = 'New BNPL Booking Review Alert'
          text = `Action Required: New BNPL Booking request #${log.templateData?.bookingNumber || ''} is pending review.`
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
  ): Promise<BookingDetailsDTO | null> {
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

      // Fail-Fast: Format Base Price directly from pricingSnapshot.basePriceEGP (SSOT)
      const baseEGP = snapshot.basePriceEGP
      if (typeof baseEGP !== 'number' || isNaN(baseEGP) || baseEGP < 0) {
        throw new Error(
          `[BookingDetailsLoader] Missing or invalid basePriceEGP in pricingSnapshot for Booking #${bookingDoc.id}`,
        )
      }
      let formattedBasePrice: ConvertedPrice
      if (snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
        formattedBasePrice = await localization.formatAlreadyConvertedPrice(
          baseEGP * rate,
          baseEGP,
          snapshot.displayCurrency,
          rate,
          ctx,
        )
      } else {
        formattedBasePrice = await localization.formatPrice(baseEGP, ctx)
      }

      // Format Loyalty Discount using existing localization abstraction
      const discountEGP = snapshot.loyaltyDiscountEGP || 0
      let formattedDiscount: ConvertedPrice | undefined
      if (discountEGP > 0) {
        if (snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
          formattedDiscount = await localization.formatAlreadyConvertedPrice(
            discountEGP * rate,
            discountEGP,
            snapshot.displayCurrency,
            rate,
            ctx,
          )
        } else {
          formattedDiscount = await localization.formatPrice(discountEGP, ctx)
        }
      }

      // Retrieve immutable point-ledger transactions and assemble authoritative loyalty summary
      const bookingLedgerEntries = await loyalty.getBookingLedgerEntries(bookingDoc.id)
      const loyaltySummary = BookingLoyaltySummaryAssembler.assemble(
        bookingDoc,
        bookingLedgerEntries,
        formattedDiscount,
      )

      // Read paid amount & outstanding balance from authoritative database properties
      if (!bookingDoc.pricingSnapshot) {
        throw new Error(`[BookingDetailsLoader] Missing required pricingSnapshot for Booking #${bookingDoc.id}`)
      }
      const totalEGP = bookingDoc.pricingSnapshot.totalAmountEGP
      if (totalEGP === undefined || totalEGP === null || totalEGP < 0) {
        throw new Error(`[BookingDetailsLoader] Invalid totalAmountEGP in pricingSnapshot for Booking #${bookingDoc.id}`)
      }
      const paidEGP = bookingDoc.amountPaid
      if (paidEGP === undefined || paidEGP === null || paidEGP < 0) {
        throw new Error(`[BookingDetailsLoader] Invalid amountPaid for Booking #${bookingDoc.id}`)
      }
      const outstandingEGP = bookingDoc.outstandingBalance
      if (outstandingEGP === undefined || outstandingEGP === null || outstandingEGP < 0) {
        throw new Error(`[BookingDetailsLoader] Invalid outstandingBalance for Booking #${bookingDoc.id}`)
      }

      let formattedPaid: ConvertedPrice
      let formattedOutstanding: ConvertedPrice

      if (snapshot.displayAmount !== undefined && snapshot.displayCurrency) {
        const displayPaid = paidEGP * rate
        const displayOutstanding = outstandingEGP * rate

        formattedPaid = await localization.formatAlreadyConvertedPrice(
          displayPaid,
          paidEGP,
          snapshot.displayCurrency,
          rate,
          ctx,
        )
        formattedOutstanding = await localization.formatAlreadyConvertedPrice(
          displayOutstanding,
          outstandingEGP,
          snapshot.displayCurrency,
          rate,
          ctx,
        )
      } else {
        formattedPaid = await localization.formatPrice(paidEGP, ctx)
        formattedOutstanding = await localization.formatPrice(outstandingEGP, ctx)
      }

      const pickupLocation =
        bookingDoc.pickupLocation &&
        bookingDoc.pickupLocation.label &&
        bookingDoc.pickupLocation.address
          ? {
              label: bookingDoc.pickupLocation.label,
              address: bookingDoc.pickupLocation.address,
              latitude: Number(bookingDoc.pickupLocation.latitude || 0),
              longitude: Number(bookingDoc.pickupLocation.longitude || 0),
              instructions: bookingDoc.pickupLocation.instructions || undefined,
              source: bookingDoc.pickupLocation.source || undefined,
            }
          : null

      const rawTravelers = Array.isArray(bookingDoc.travelers) ? bookingDoc.travelers : []
      const travelers: BookingTravelerDTO[] = rawTravelers.map((t, idx) => {
        let passportMasked: string | undefined = undefined
        if (t.passportNumber && t.passportNumber.trim()) {
          const p = t.passportNumber.trim()
          passportMasked = p.length > 4 ? `${p.slice(0, 2)}••••${p.slice(-2)}` : '••••'
        }
        return {
          firstName: t.firstName || '',
          lastName: t.lastName || '',
          type: t.type === 'child' ? 'child' : t.type === 'infant' ? 'infant' : 'adult',
          isLead: idx === 0,
          email: idx === 0 ? t.email || undefined : undefined,
          phone: idx === 0 ? t.phone || undefined : undefined,
          nationality: t.nationality || undefined,
          passportMasked,
        }
      })

      const rawStays = snapshot.commercialBreakdown?.staysBreakdown
      const stays: BookingStaySnapshotDTO[] = Array.isArray(rawStays)
        ? rawStays.map((s) => ({
            order: s.order || 1,
            propertyName: s.propertyName || 'Hotel Accommodation',
            nights: s.nights || 1,
            roomCategory: s.roomCategory || undefined,
          }))
        : []

      const rawRooms = snapshot.commercialBreakdown?.roomAllocation
      const roomAllocation: BookingRoomAllocationDTO[] = Array.isArray(rawRooms)
        ? rawRooms.map((r) => ({
            roomIndex: r.roomIndex,
            occupancy: r.occupancy,
            adults: r.adults,
            children: r.children,
          }))
        : []

      return {
        bookingNumber: bookingDoc.bookingNumber,
        experienceTitle,
        experienceType: exp?.type === 'daily_tour' ? 'daily_tour' : 'package',
        departureDate: bookingDoc.startDate,
        endDate: bookingDoc.endDate && bookingDoc.endDate !== bookingDoc.startDate ? bookingDoc.endDate : undefined,
        passengersCount: bookingDoc.travelers?.length || 1,
        basePrice: formattedBasePrice,
        totalCost: formattedTotal,
        pointsEarned: loyaltySummary.pointsEarned,
        status: bookingDoc.status,
        paymentStatus: bookingDoc.paymentStatus || 'unpaid',
        paidAmount: formattedPaid,
        outstandingBalance: formattedOutstanding,
        rawPaidAmount: paidEGP,
        rawOutstandingBalance: outstandingEGP,
        rawTotalCost: totalEGP,
        loyaltySummary,
        pickupLocation,
        travelers,
        stays,
        roomAllocation,
      }
    } catch (err) {
      console.error(`[BookingDetailsLoader] Error loading booking #${bookingNumber}:`, err)
      throw err
    }
  }
}
