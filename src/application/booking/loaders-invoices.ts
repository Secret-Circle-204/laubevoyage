import { getApplicationServices } from '@/application/factory'
import { getLocaleContext } from '@/lib/get-locale-context'
import type { CustomerInvoicesPortalDTO, CustomerInvoiceItemDTO } from './dto-invoices'
import type { PaymentStatusType } from '@/domains/payment/types'

export class CustomerInvoicesLoader {
  static async load(
    customerId: number,
    options?: { page?: number; limit?: number; paymentStatus?: string },
  ): Promise<CustomerInvoicesPortalDTO> {
    try {
      const { booking, payment, experience, localization } = await getApplicationServices()
      const ctx = await getLocaleContext()

      // 1. Strict Pagination Limits: Page >= 1, Limit clamped between 1 and 20 (default 10)
      const page = Math.max(1, Number(options?.page) || 1)
      const limit = Math.min(20, Math.max(1, Number(options?.limit) || 10))

      // 2. Strict Application Boundary Validation for payment status filter
      const allowedStatuses: PaymentStatusType[] = ['successful', 'refunded', 'partially_refunded']
      let validStatus: PaymentStatusType | undefined = undefined
      if (options?.paymentStatus) {
        const st = options.paymentStatus.toLowerCase().trim() as PaymentStatusType
        if (allowedStatuses.includes(st)) {
          validStatus = st
        }
      }

      // 3. Query 1: Payment-Driven Financial Source of Truth with DB Pagination & Filter
      const paymentResult = await payment.getCustomerPayments(
        customerId,
        page,
        limit,
        validStatus ? { status: validStatus } : undefined,
      )
      const payments = paymentResult.data || []

      // Short-circuit: 0 payments = 0 extra queries
      if (payments.length === 0) {
        return {
          invoices: [],
          total: paymentResult.total || 0,
          page: paymentResult.page || page,
          totalPages: paymentResult.totalPages || 1,
          limit,
          currentPaymentStatus: validStatus,
        }
      }

      const bookingIds = payments.map((p) => p.bookingId)

      // 4. Batch-Resolve matching bookings (Query 2)
      const bookings = await booking.getManyByIds(bookingIds)
      const bookingsMap = new Map(bookings.map((b) => [b.id, b]))

      const uniqueExperienceIds = Array.from(
        new Set(bookings.map((b) => b.experienceId).filter((id): id is number => typeof id === 'number')),
      )

      // 5. Batch-Resolve matching experiences (Query 3)
      const experiences = await experience.getManyByIds(uniqueExperienceIds)
      const experiencesMap = new Map(experiences.map((e) => [e.id, e]))

      // 6. Map payment transactions to Customer Invoice DTOs with localized prices
      const invoiceItems: CustomerInvoiceItemDTO[] = await Promise.all(
        payments.map(async (tx) => {
          const b = bookingsMap.get(tx.bookingId)
          const exp = b ? experiencesMap.get(b.experienceId) : undefined

          const attempt = tx.attempts?.[0]
          const txCurrency = attempt?.currency || 'EGP'
          const displayAmount = attempt?.amount || 0

          const snapshot = b?.pricingSnapshot
          const basePriceEGP = snapshot?.totalAmountEGP || displayAmount
          const exchangeRate = snapshot?.exchangeRate || 1

          const formattedAmount = await localization.formatAlreadyConvertedPrice(
            displayAmount,
            basePriceEGP,
            txCurrency,
            exchangeRate,
            ctx,
          )

          const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return {
            id: tx.transactionId,
            bookingNumber: b?.bookingNumber || `BK-#${tx.bookingId}`,
            status: tx.status,
            title: exp?.title || (b ? `Trip #${b.bookingNumber}` : `Transaction #${tx.transactionId}`),
            date: formattedDate,
            amount: formattedAmount,
          }
        }),
      )

      return {
        invoices: invoiceItems,
        total: paymentResult.total,
        page: paymentResult.page,
        totalPages: paymentResult.totalPages,
        limit,
        currentPaymentStatus: validStatus,
      }
    } catch (err) {
      console.error(`[CustomerInvoicesLoader] Failed loading invoices for customer #${customerId}:`, err)
      throw err
    }
  }
}
