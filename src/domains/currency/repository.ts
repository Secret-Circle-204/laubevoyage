import type { Payload, PayloadRequest } from 'payload'
import type { ExchangeRate as ExchangeRateDoc } from '@/payload-types'

/**
 * Currency Repository
 *
 * Decouples the CurrencyService from the Payload persistence layer.
 * All database queries for the exchange-rates collection go through this repository.
 */
export class CurrencyRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findRate(
    from: string,
    to: string,
    req?: PayloadRequest,
  ): Promise<ExchangeRateDoc | null> {
    const result = await this.payload.find({
      collection: 'exchange-rates',
      where: {
        and: [
          { fromCurrency: { equals: from } },
          { toCurrency: { equals: to } },
          { isActive: { equals: true } },
        ],
      },
      limit: 1,
      req,
    })
    return result.docs[0] || null
  }

  async updateRate(
    from: string,
    to: string,
    rate: number,
    req?: PayloadRequest,
  ): Promise<void> {
    await this.payload.update({
      collection: 'exchange-rates',
      where: {
        and: [
          { fromCurrency: { equals: from } },
          { toCurrency: { equals: to } },
        ],
      },
      data: {
        rate,
        isActive: true,
      },
      req,
    })
  }
}
