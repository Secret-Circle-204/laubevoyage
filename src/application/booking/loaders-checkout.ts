import { getDomainServices } from '@/domains/factory'
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
      const { booking, experience, payment, localization, pricingFacade, bookingPricingUseCase } = await getDomainServices()

      const locale = options?.locale || 'en'
      const currency = options?.currency || 'EGP'
      const ctx = localization.buildContext({
        language: locale as any,
        currency: currency as any,
      })

      const gateways: PaymentGatewayDTO[] = await payment.getAvailableGateways()
      const session = await SessionResolver.resolve()
      const availableLoyaltyPoints = session.points ?? 0

      if (bookingId !== 'new') {
        const bookingDoc = await booking.getByBookingNumber(bookingId)
        if (!bookingDoc) return null

        const expDoc = await experience.getById(bookingDoc.experienceId)
        if (!expDoc) return null

        const travelers = Array.isArray(bookingDoc.travelers) ? bookingDoc.travelers : []
        const adultsCount = travelers.filter((t) => t.type !== 'child').length || travelers.length
        const childrenCount = travelers.filter((t) => t.type === 'child').length

        const snapshot = bookingDoc.pricingSnapshot
        if (!snapshot) return null

        const subtotalFormatted = await localization.formatPrice(snapshot.subtotalEGP, ctx)
        const totalFormatted = await localization.formatPrice(snapshot.subtotalEGP, ctx)

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
      }
    } catch {
      return null
    }
  }
}
