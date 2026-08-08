import type { ConvertedPrice } from '@/domains/currency/types'

export interface CustomerBookingCardDTO {
  id: number
  reference: string
  experienceTitle: string
  experienceImage: string
  departureDate: string
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  passengersCount: number
  totalCost: ConvertedPrice
}

export interface CustomerPortalOverviewDTO {
  customerId: number
  fullName: string
  email: string
  tier: 'explorer' | 'voyager' | 'elite'
  points: number
  nextTierProgressPercent: number
  pointsToNextTier: number
  nextTierName: string
  activeBookingsCount: number
  recentBookings: CustomerBookingCardDTO[]
  unreadNotificationsCount: number
  passportNumber?: string
  nationality?: string
}

export interface CustomerNotificationItemDTO {
  id: string
  title: string
  text: string
  time: string
  unread: boolean
  templateId: string
}

