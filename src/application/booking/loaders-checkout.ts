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
      const availableLoyaltyPoints = await loyalty.getCustomerBalance(session.customerId)

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

        const subtotalConverted = snapshot.subtotalEGP * (snapshot.exchangeRate || 1)
        const subtotalFormatted = await localization.formatAlreadyConvertedPrice(
          subtotalConverted,
          snapshot.subtotalEGP,
          snapshot.displayCurrency || 'EGP',
          snapshot.exchangeRate || 1,
          ctx
        )

        const totalFormatted = await localization.formatAlreadyConvertedPrice(
          snapshot.displayAmount,
          snapshot.totalAmountEGP,
          snapshot.displayCurrency || 'EGP',
          snapshot.exchangeRate || 1,
          ctx
        )

        const imageUrl = expDoc.heroUrl || ''

        return {
          bookingId: bookingDoc.bookingNumber,
          experienceId: expDoc.id,
          slotId: expDoc.type === 'package'
            ? (await experience.getDepartureSlotByDate(expDoc.id, bookingDoc.startDate))?.id || undefined
            : undefined,
          experienceTitle: expDoc.title,
          experienceType: expDoc.type === 'daily_tour' ? 'daily_tour' : 'package',
          imageUrl,
          departureDate: bookingDoc.startDate,
          adultsCount,
          childrenCount,
          basePricePerPersonEGP: snapshot.basePriceEGP,
          subtotalPrice: subtotalFormatted,
          promoDiscountEGP: snapshot.promotionDiscountEGP,
          loyaltyDiscountEGP: snapshot.loyaltyDiscountEGP,
          totalCost: totalFormatted,
          availableLoyaltyPoints,
          gateways,
          leadTraveler,
        }
      }

      // Handle new draft checkout
      if (!options?.experienceId || !options?.slotId || !options?.adults) {
        return null
      }

      const expId = options.experienceId
      const slotId = options.slotId
      const expDoc = await experience.getById(expId)
      if (!expDoc) return null

      const adultsCount = options.adults
      const childrenCount = options.children ?? 0

      // Delegate pricing and snapshots orchestration to application UseCase
      const { snapshot, subtotalPrice, totalCost, departure } = await bookingPricingUseCase.calculate({
        experienceId: expId,
        slotId,
        adultsCount,
        childrenCount,
        ctx,
      })

      const imageUrl = expDoc.heroUrl || ''

      const { getDomainServices } = await import('@/domains/factory')
      const { customer } = await getDomainServices()
      const customerDoc = await customer.getById(session.customerId).catch(() => null)
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
        slotId: options.slotId,
        experienceTitle: departure.experienceTitle,
        experienceType: departure.experienceType === 'daily_tour' ? 'daily_tour' : 'package',
        imageUrl,
        departureDate: departure.date,
        adultsCount,
        childrenCount,
        basePricePerPersonEGP: departure.basePriceEGP,
        subtotalPrice: subtotalPrice,
        promoDiscountEGP: snapshot.promotionDiscountEGP,
        loyaltyDiscountEGP: snapshot.loyaltyDiscountEGP,
        totalCost: totalCost,
        availableLoyaltyPoints,
        gateways,
        leadTraveler,
      }
    } catch (err) {
      console.error(`[CheckoutPageLoader] Failed loading checkout page for booking #${bookingId}:`, err)
      throw err
    }
  }
}
