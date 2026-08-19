import type { PaymentAggregate } from './aggregate'
import { PaymentRepository } from './repository'

/**
 * Payment Queries Sub-Service
 * Read-only query handler for fetching payment transaction aggregates.
 */
export class PaymentQueries {
  private repository: PaymentRepository

  constructor(repository: PaymentRepository) {
    this.repository = repository
  }

  async getByTransactionId(transactionId: string): Promise<PaymentAggregate | null> {
    return this.repository.findByTransactionId(transactionId)
  }

  async getByBookingId(bookingId: number): Promise<PaymentAggregate | null> {
    return this.repository.findByBookingId(bookingId)
  }

  async getManyByBookingIds(bookingIds: number[]): Promise<PaymentAggregate[]> {
    return this.repository.findManyByBookingIds(bookingIds)
  }

  async getCustomerPayments(
    customerId: number,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: import('./types').PaymentStatusType },
  ): Promise<import('@/types').PaginatedResponse<PaymentAggregate>> {
    return this.repository.findByCustomerId(customerId, page, limit, filters)
  }

  async getByGatewayReference(gatewayReference: string): Promise<PaymentAggregate | null> {
    return this.repository.findByGatewayReference(gatewayReference)
  }
}

