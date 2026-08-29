import type { ConvertedPrice } from '@/domains/currency/types'
import type { BookingPaymentStatus } from '@/domains/booking/types'
import type { BookingStatus } from '@/types'
import type { ExperienceType } from '@/domains/experience/types'

export interface PaymentReceiptDTO {
  attemptId: string
  attemptNumber: number
  amount: ConvertedPrice
  provider: string
  status: string
  transactionReference?: string
  date: string
}

export interface CustomerInvoiceItemDTO {
  id: string
  bookingNumber: string
  bookingId: number
  title: string
  productType?: ExperienceType
  productTypeLabel?: string
  destinationCity?: string
  durationText?: string
  departureDate: string
  departureTime?: string
  endDate?: string
  destinationTimezone?: string
  leadTravelerName: string
  passengersCount: number
  bookingStatus: BookingStatus
  paymentStatus: BookingPaymentStatus
  basePrice?: ConvertedPrice
  loyaltyDiscount?: ConvertedPrice
  promoDiscount?: ConvertedPrice
  totalAmount: ConvertedPrice
  paidAmount: ConvertedPrice
  outstandingBalance: ConvertedPrice
  isCancelled: boolean
  paymentPlan: string
  receipts: PaymentReceiptDTO[]
  date: string
}

export interface CustomerInvoicesPortalDTO {
  invoices: CustomerInvoiceItemDTO[]
  total: number
  page: number
  totalPages: number
  limit: number
  currentStatus?: string
}

