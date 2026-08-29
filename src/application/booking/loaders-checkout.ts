import { getApplicationServices } from '@/application/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import type { CheckoutPageDTO, PaymentGatewayDTO } from './dto-checkout'

export class CheckoutPageLoader {
  static async loadByBookingId(
    bookingId: string,
    options?: {
      locale?: string
      currency?: string
      experienceId?: number
      adults?: number
      children?: number
      slotId?: number
      date?: string
      startTime?: string
    },
  ): Promise<CheckoutPageDTO | null> {
    try {
      const { booking, experience, payment, localization, pricingFacade, bookingPricingUseCase, loyalty } = await getApplicationServices()

      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const gateways: PaymentGatewayDTO[] = await payment.getAvailableGateways()
      const session = await SessionResolver.resolve()
      if (!session.customerId) return null
      const settledBalance = await loyalty.getCustomerBalance(session.customerId)
      const activeHeldPoints = await booking.getActiveHeldPointsForCustomer(session.customerId)
      const availableLoyaltyPoints = Math.max(0, settledBalance - activeHeldPoints)
      const loyaltyConfig = await loyalty.getActiveConfig()

      if (bookingId !== 'new') {
        const bookingDoc = await booking.getByBookingNumber(bookingId)
        if (!bookingDoc || (bookingDoc.status !== 'draft' && bookingDoc.status !== 'pending_payment')) return null

        const expDoc = await experience.getById(bookingDoc.experienceId)
        if (!expDoc) return null

        const travelers = Array.isArray(bookingDoc.travelers) ? bookingDoc.travelers : []
        const adultsCount = travelers.filter((t) => t.type !== 'child').length || travelers.length
        const childrenCount = travelers.filter((t) => t.type === 'child').length

        const firstTraveler = travelers[0]
        const leadTraveler = firstTraveler
          ? {
              firstName: firstTraveler.firstName || '',
              lastName: firstTraveler.lastName || '',
              email: firstTraveler.email || '',
              phone: firstTraveler.phone || '',
            }
          : undefined

        const snapshot = bookingDoc.pricingSnapshot
        if (!snapshot) return null

        const subtotalConverted = snapshot.subtotalEGP * snapshot.exchangeRate
        const subtotalFormatted = await localization.formatAlreadyConvertedPrice(
          subtotalConverted,
          snapshot.subtotalEGP,
          snapshot.displayCurrency,
          snapshot.exchangeRate,
          ctx
        )

        const totalFormatted = await localization.formatAlreadyConvertedPrice(
          snapshot.displayAmount,
          snapshot.totalAmountEGP,
          snapshot.displayCurrency,
          snapshot.exchangeRate,
          ctx
        )

        const loyaltyDiscountPrice = snapshot.loyaltyDiscountEGP > 0
          ? await localization.formatAlreadyConvertedPrice(
              snapshot.loyaltyDiscountEGP * snapshot.exchangeRate,
              snapshot.loyaltyDiscountEGP,
              snapshot.displayCurrency,
              snapshot.exchangeRate,
              ctx
            )
          : undefined

        const imageUrl = expDoc.heroUrl || ''

        return {
          bookingId: bookingDoc.bookingNumber,
          experienceId: expDoc.id,
          slotId: bookingDoc.departureSlot || undefined,
          experienceTitle: expDoc.title,
          experienceType: expDoc.type === 'daily_tour' ? 'daily_tour' : 'package',
          imageUrl,
          departureDate: bookingDoc.startDate,
          adultsCount,
          childrenCount,
          basePricePerPersonEGP: snapshot.basePriceEGP,
          subtotalPrice: subtotalFormatted,
          promoDiscountEGP: snapshot.promotionDiscountEGP,
          totalCost: totalFormatted,
          availableLoyaltyPoints,
          redemptionUnit: loyaltyConfig.redemptionPointsUnit,
          minRedemptionPoints: loyaltyConfig.minRedemptionPoints,
          maxRedemptionPercent: loyaltyConfig.maxRedemptionPercent,
          redemptionStepUnit: loyaltyConfig.redemptionStepUnit || loyaltyConfig.redemptionPointsUnit,
          loyaltyDiscountPrice,
          gateways,
          leadTraveler,
        }
      }

      // Handle new draft checkout
      if (!options?.experienceId || !options?.adults) {
        return null
      }

      const expId = options.experienceId
      const expDoc = await experience.getById(expId)
      if (!expDoc) return null

      const isFixedPackage = expDoc.type === 'package' && ((expDoc as any).packageMode === 'fixed_date' || (!(expDoc as any).packageMode && options?.slotId))
      const isFlexiblePackage = expDoc.type === 'package' && (expDoc as any).packageMode === 'flexible_date'
      const isDailyTour = expDoc.type === 'daily_tour'

      if (isDailyTour && (!options?.date || !options?.startTime)) {
        return null
      }
      if (isFlexiblePackage && !options?.date) {
        return null
      }
      if (isFixedPackage && !options?.slotId) {
        return null
      }

      const adultsCount = options.adults
      const childrenCount = options.children ?? 0

      // Delegate pricing calculation to pure usecase
      let calculatedPricing
      if (isFixedPackage && options.slotId) {
        calculatedPricing = await bookingPricingUseCase.calculate({
          experienceId: expId,
          slotId: options.slotId,
          adultsCount,
          childrenCount,
          ctx,
        })
      } else if (isFlexiblePackage && options.date) {
        calculatedPricing = await bookingPricingUseCase.calculatePreview({
          experienceId: expId,
          date: options.date,
          startTime: '',
          adultsCount,
          childrenCount,
          ctx,
        })
      } else if (isDailyTour && options.date && options.startTime) {
        calculatedPricing = await bookingPricingUseCase.calculatePreview({
          experienceId: expId,
          date: options.date,
          startTime: options.startTime,
          adultsCount,
          childrenCount,
          ctx,
        })
      } else {
        return null
      }

      const { snapshot, subtotalPrice, totalCost, departure } = calculatedPricing

      const imageUrl = expDoc.heroUrl || ''

      const { getDomainServices } = await import('@/domains/factory')
      const { customer } = await getDomainServices()
      const customerDoc = await customer.getById(session.customerId)
      const leadTraveler = customerDoc
        ? {
            firstName: customerDoc.firstName || '',
            lastName: customerDoc.lastName || '',
            email: customerDoc.email || '',
            phone: customerDoc.phone || '',
          }
        : undefined

      return {
        bookingId: 'new',
        experienceId: expId,
        slotId: isFixedPackage ? (options.slotId || departure.id) : undefined,
        experienceTitle: departure.experienceTitle,
        experienceType: departure.experienceType === 'daily_tour' ? 'daily_tour' : 'package',
        imageUrl,
        departureDate: departure.date,
        startTime: departure.startTime,
        adultsCount,
        childrenCount,
        basePricePerPersonEGP: departure.effectiveBasePrice,
        subtotalPrice: subtotalPrice,
        promoDiscountEGP: snapshot.promotionDiscountEGP,
        totalCost: totalCost,
        availableLoyaltyPoints,
        redemptionUnit: loyaltyConfig.redemptionPointsUnit,
        minRedemptionPoints: loyaltyConfig.minRedemptionPoints,
        maxRedemptionPercent: loyaltyConfig.maxRedemptionPercent,
        redemptionStepUnit: loyaltyConfig.redemptionStepUnit || loyaltyConfig.redemptionPointsUnit,
        estimatedEarnPoints: calculatedPricing.estimatedEarnPoints,
        loyaltyDiscountPrice: calculatedPricing.loyaltyDiscountPrice,
        gateways,
        leadTraveler,
      }
    } catch (err) {
      console.error(`[CheckoutPageLoader] Failed loading checkout page for booking #${bookingId}:`, err)
      throw err
    }
  }
}
