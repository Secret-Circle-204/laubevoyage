import { LoyaltyTier } from '@/types'

export interface CustomerOverviewDTO {
  customerId: number
  email: string
  fullName: string
  isEmailVerified: boolean
  status: string
  preferredCurrency: string
}

export interface LoyaltyWalletDTO {
  tier: LoyaltyTier
  pointsBalance: number
  activeHoldsCount: number
  totalSpentEGP: number
}

export interface ActiveTripsSummaryDTO {
  upcomingCount: number
  activeBookingsCount: number
  latestBookingNumber?: string
  nextDepartureDate?: string
}

export interface SecuritySessionDTO {
  activeDeviceCount: number
  lastLoginAt?: string
}

export interface DashboardMetricsDTO {
  cacheHit: boolean
  aggregationDurationMs: number
  projectionVersion: string
  lastRefreshAt: string
}

export interface CustomerPortalProjection {
  projectionId: string
  customerId: number
  customer: CustomerOverviewDTO
  loyalty: LoyaltyWalletDTO
  trips: ActiveTripsSummaryDTO
  security: SecuritySessionDTO
  metrics: DashboardMetricsDTO
  version: number
  updatedAt: string
}

export interface DashboardWidget {
  widgetId: string
  title: string
  type: 'trips' | 'loyalty' | 'payments' | 'invoices' | 'travelers' | 'notifications'
  data: Record<string, any>
}

export interface CustomerDocumentItem {
  documentId: string
  title: string
  type: 'voucher' | 'invoice' | 'e_ticket' | 'insurance'
  bookingNumber: string
  fileUrl: string
  createdAt: string
}

export interface DashboardPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
