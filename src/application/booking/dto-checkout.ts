import type { PriceDisplayViewModel } from '../shared/view-models/price-display'

export interface PaymentGatewayDTO {
  id: string
  name: string
  icon: string
  isAvailable: boolean
}

export interface CheckoutPageDTO {
  bookingId: string
  experienceId: number
  experienceTitle: string
  experienceType: 'package' | 'daily_tour'
  imageUrl: string
  departureDate: string
  adultsCount: number
  childrenCount: number
  basePricePerPersonEGP: number
  subtotalEGP: number
  promoDiscountEGP: number
  loyaltyDiscountEGP: number
  totalCostEGP: PriceDisplayViewModel
  availableLoyaltyPoints: number
  gateways: PaymentGatewayDTO[]
}
