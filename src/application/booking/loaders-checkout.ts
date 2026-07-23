import { getDomainServices } from '@/domains/factory'
import type { CheckoutPageDTO } from './dto-checkout'

export class CheckoutPageLoader {
  static async loadByBookingId(bookingId: string): Promise<CheckoutPageDTO | null> {
    try {
      if (bookingId !== 'new') {
        const { booking, payment } = await getDomainServices()
        const bookingDoc = await booking.getByBookingNumber(bookingId)
        if (!bookingDoc) return null

        const gateways = await payment.getAvailableGateways()
        const passengers = Array.isArray(bookingDoc.travelers) ? bookingDoc.travelers.length : 1
        const total = bookingDoc.pricingSnapshot?.totalAmountEGP || 0
        const basePrice = bookingDoc.pricingSnapshot?.basePriceEGP || total

        return {
          bookingId: bookingDoc.bookingNumber || bookingId,
          experienceId: bookingDoc.experienceId || 0,
          experienceTitle: `Booking #${bookingDoc.bookingNumber}`,
          experienceType: 'package',
          imageUrl: '',
          departureDate: bookingDoc.startDate || '',
          adultsCount: passengers,
          childrenCount: 0,
          basePricePerPersonEGP: basePrice,
          subtotalEGP: total,
          promoDiscountEGP: bookingDoc.pricingSnapshot?.promotionDiscountEGP || 0,
          loyaltyDiscountEGP: bookingDoc.pricingSnapshot?.loyaltyDiscountEGP || 0,
          totalCostEGP: { amountEGP: total, displayAmount: total, displayCurrency: 'EGP' },
          availableLoyaltyPoints: 0,
          gateways,
        }
      }

      return null
    } catch {
      return null
    }
  }
}
