import type { ConvertedPrice } from '@/domains/currency/types'
import type { TravelerInput, BookingPickupLocation } from '@/domains/booking/types'

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
  startTime?: string
  adultsCount: number
  childrenCount: number
  basePricePerPersonEGP: number
  subtotalPrice: ConvertedPrice
  promoDiscountEGP: number
  totalCost: ConvertedPrice
  availableLoyaltyPoints: number
  redemptionUnit: number
  minRedemptionPoints: number
  maxRedemptionPercent: number
  redemptionStepUnit: number
  estimatedEarnPoints?: number
  loyaltyDiscountPrice?: ConvertedPrice
  gateways: PaymentGatewayDTO[]
  childAges?: number[]
  childBeddingModes?: ('sharing_bed' | 'extra_bed')[]
  selectedAllocationId?: string
  selectedAccommodationOptions?: Record<number, string>
  leadTraveler?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  initialTravelers?: TravelerInput[]
  initialPickupLocation?: BookingPickupLocation | null
  destinationCityName?: string
  destinationCountryName?: string
}




