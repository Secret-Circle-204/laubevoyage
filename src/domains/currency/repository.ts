import type { Payload } from 'payload'
import type { ExchangeRateSource } from './types'

export class CurrencyRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findExchangeRates(fromCurrency: string = 'EGP') {
    return this.payload.find({
      collection: 'exchange-rates',
      where: {
        fromCurrency: { equals: fromCurrency },
      },
      limit: 1000,
      depth: 0,
    })
  }

  async findActiveCurrencies() {
    return this.payload.find({
      collection: 'currencies',
      where: {
        isActive: { equals: true },
      },
      limit: 1000,
      depth: 0,
    })
  }

  async findAllCatalogCurrencies() {
    return this.payload.find({
      collection: 'currencies',
      limit: 1000,
      depth: 0,
    })
  }


  async markAllStale(errorMessage: string, attemptTime: string) {
    const existingRates = await this.payload.find({
      collection: 'exchange-rates',
      limit: 1000,
      depth: 0,
    })

    for (const doc of existingRates.docs) {
      await this.payload.update({
        collection: 'exchange-rates',
        id: doc.id,
        data: {
          syncStatus: 'stale',
          lastAttempt: attemptTime,
          lastError: errorMessage,
        },
      })
    }
  }

  async upsertRate(params: {
    fromCurrency: string
    toCurrency: string
    rate: number
    source: ExchangeRateSource
    syncStatus: 'synced' | 'failed' | 'stale'
    timestamp: string
  }) {
    const { fromCurrency, toCurrency, rate, source, syncStatus, timestamp } = params

    const existing = await this.payload.find({
      collection: 'exchange-rates',
      where: {
        and: [
          { fromCurrency: { equals: fromCurrency } },
          { toCurrency: { equals: toCurrency } },
        ],
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      await this.payload.update({
        collection: 'exchange-rates',
        id: existing.docs[0].id,
        data: {
          rate,
          source,
          lastUpdate: timestamp,
          lastSuccess: timestamp,
          lastAttempt: timestamp,
          lastError: null,
          syncStatus,
        },
      })
    } else {
      await this.payload.create({
        collection: 'exchange-rates',
        data: {
          fromCurrency,
          toCurrency,
          rate,
          source,
          lastUpdate: timestamp,
          lastSuccess: timestamp,
          lastAttempt: timestamp,
          lastError: null,
          syncStatus,
        },
      })
    }
  }

  async getLatestRateSync(): Promise<{ source: ExchangeRateSource; lastSuccess: string } | null> {
    const existing = await this.payload.find({
      collection: 'exchange-rates',
      limit: 1,
      sort: '-lastSuccess',
      depth: 0,
    })
    if (existing.docs.length > 0 && existing.docs[0].lastSuccess && existing.docs[0].source) {
      return {
        source: existing.docs[0].source as ExchangeRateSource,
        lastSuccess: new Date(existing.docs[0].lastSuccess).toISOString(),
      }
    }
    return null
  }
}
