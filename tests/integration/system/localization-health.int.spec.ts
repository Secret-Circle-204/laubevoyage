import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/internal/health/localization/route'
import { NextRequest } from 'next/server'
import * as payloadModule from 'payload'
import * as domainFactory from '@/domains/factory'

describe('Localization Health Check API Handler Integration Test', () => {
  it('should successfully run active verification and return PASS status with details', async () => {
    const mockPayload: any = {
      find: vi.fn().mockImplementation(({ collection }: { collection: string }) => {
        if (collection === 'currencies') {
          return Promise.resolve({
            docs: [
              { isoCode: 'EGP', isActive: true, decimals: 2 },
              { isoCode: 'USD', isActive: true, decimals: 2 },
              { isoCode: 'EUR', isActive: true, decimals: 2 },
            ],
          })
        }
        if (collection === 'languages') {
          return Promise.resolve({
            docs: [
              { code: 'en', name: 'English', isActive: true, preferredDisplayCurrency: 'USD' },
              { code: 'de', name: 'German', isActive: true, preferredDisplayCurrency: 'EUR' },
            ],
          })
        }
        if (collection === 'exchange-rates') {
          return Promise.resolve({
            docs: [
              { fromCurrency: 'EGP', toCurrency: 'USD', rate: 0.02, updatedAt: new Date().toISOString() },
              { fromCurrency: 'EGP', toCurrency: 'EUR', rate: 0.018, updatedAt: new Date().toISOString() },
            ],
          })
        }
        return Promise.resolve({ docs: [] })
      }),
    }

    vi.spyOn(domainFactory, 'getDomainServices').mockResolvedValue({
      localization: {
        buildContext: vi.fn().mockResolvedValue({ language: 'de', currency: 'EUR', timezone: 'Europe/Berlin' }),
        formatPrice: vi.fn().mockImplementation(async (amountEGP: number, ctx: any) => {
          const rate = ctx.currency === 'USD' ? 0.02 : ctx.currency === 'EUR' ? 0.018 : 1
          const converted = amountEGP * rate
          return {
            amount: converted,
            convertedAmount: converted,
            currency: ctx.currency,
            formatted: `${converted} ${ctx.currency}`,
          }
        }),
      },
      destination: {},
      experience: {},
      payload: mockPayload,
    } as any)

    const req = new NextRequest('http://localhost:3000/api/internal/health/localization')
    const response = await GET(req)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.status).toBe('PASS')
    expect(body.checks.databaseConfig).toBe('PASS')
    expect(body.checks.resolutionCascade).toBe('PASS')
    expect(body.checks.pricingConversion).toBe('PASS')
    expect(body.details.activeCurrencies.length).toBeGreaterThan(0)
    expect(body.details.verifiedConversions.length).toBeGreaterThan(0)
  })
})
