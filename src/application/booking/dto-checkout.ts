import type { ConvertedPrice } from '@/domains/currency/types'

export interface PaymentGatewayDTO {
  id: string
  name: string
  icon: string
  isAvailable: boolean
}

export interface CheckoutPageDTO {
  bookingId: string
  experienceId: number
  slotId?: number
  experienceTitle: string
  experienceType: 'package' | 'daily_tour'
  imageUrl: string
  departureDate: string
  adultsCount: number
  childrenCount: number
  basePricePerPersonEGP: number
  subtotalPrice: ConvertedPrice
  promoDiscountEGP: number
  loyaltyDiscountEGP: number
  totalCost: ConvertedPrice
  availableLoyaltyPoints: number
  gateways: PaymentGatewayDTO[]
  leadTraveler?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}
