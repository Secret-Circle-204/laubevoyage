import type { ConvertedPrice } from '@/domains/currency/types'
import type { PaymentStatusType } from '@/domains/payment/types'

export interface CustomerInvoiceItemDTO {
  id: string
  bookingNumber: string
  status: PaymentStatusType
  title: string
  date: string
  amount: ConvertedPrice
}

export interface CustomerInvoicesPortalDTO {
  invoices: CustomerInvoiceItemDTO[]
  total: number
  page: number
  totalPages: number
  limit: number
  currentPaymentStatus?: PaymentStatusType
}
