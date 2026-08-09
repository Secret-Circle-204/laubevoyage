import { describe, it, expect, vi } from 'vitest'
import { toSmallestUnit, fromSmallestUnit } from '../../../src/domains/currency/rounding'

vi.mock('../../../src/domains/currency/catalog-registry', () => {
  const mockCurrencies: Record<string, { decimals: number }> = {
    USD: { decimals: 2 },
    EGP: { decimals: 2 },
    JPY: { decimals: 0 },
    KWD: { decimals: 3 },
  }

  return {
    catalogRegistry: {
      get: vi.fn().mockImplementation(async (isoCode: string) => {
        const code = isoCode.toUpperCase()
        if (mockCurrencies[code]) {
          return {
            isoCode: code,
            decimals: mockCurrencies[code].decimals,
            name: code,
            symbol: '$',
            isActive: true,
            displayOrder: 0,
            isDefault: false,
            numericCode: 1,
          }
        }
        return undefined
      })
    }
  }
})

describe('Currency Domain: Rounding & Unit Conversion Unit Tests', () => {
  describe('toSmallestUnit', () => {
    it('should convert USD (2 decimals) to cents correctly', async () => {
      const result = await toSmallestUnit(4.99, 'USD')
      expect(result).toBe(499)
    })

    it('should convert JPY (0 decimals) directly without scaling', async () => {
      const result = await toSmallestUnit(1000, 'JPY')
      expect(result).toBe(1000)
    })

    it('should convert KWD (3 decimals) to minor units correctly', async () => {
      const result = await toSmallestUnit(12.345, 'KWD')
      expect(result).toBe(12345)
    })

    it('should convert EGP (2 decimals) to cents correctly', async () => {
      const result = await toSmallestUnit(100, 'EGP')
      expect(result).toBe(10000)
    })

    it('should throw an error for unknown currency', async () => {
      await expect(toSmallestUnit(50.5, 'UNKNOWN')).rejects.toThrow(
        '[CurrencyDomain] Currency "UNKNOWN" is not registered or active in the CMS catalog.'
      )
    })
  })

  describe('fromSmallestUnit', () => {
    it('should convert USD cents back to USD major amount', async () => {
      const result = await fromSmallestUnit(499, 'USD')
      expect(result).toBe(4.99)
    })

    it('should convert JPY minor units directly back to JPY major amount', async () => {
      const result = await fromSmallestUnit(1000, 'JPY')
      expect(result).toBe(1000)
    })

    it('should convert KWD minor units back to KWD major amount', async () => {
      const result = await fromSmallestUnit(12345, 'KWD')
      expect(result).toBe(12.345)
    })

    it('should convert EGP cents back to EGP major amount', async () => {
      const result = await fromSmallestUnit(10000, 'EGP')
      expect(result).toBe(100)
    })

    it('should throw an error for unknown currency on backward conversion', async () => {
      await expect(fromSmallestUnit(5050, 'UNKNOWN')).rejects.toThrow(
        '[CurrencyDomain] Currency "UNKNOWN" is not registered or active in the CMS catalog.'
      )
    })
  })

  describe('Inverse properties', () => {
    it('should satisfy inverse conversion property for USD', async () => {
      const original = 19.99
      const minor = await toSmallestUnit(original, 'USD')
      const major = await fromSmallestUnit(minor, 'USD')
      expect(major).toBe(original)
    })

    it('should satisfy inverse conversion property for JPY', async () => {
      const original = 5000
      const minor = await toSmallestUnit(original, 'JPY')
      const major = await fromSmallestUnit(minor, 'JPY')
      expect(major).toBe(original)
    })

    it('should satisfy inverse conversion property for KWD', async () => {
      const original = 123.456
      const minor = await toSmallestUnit(original, 'KWD')
      const major = await fromSmallestUnit(minor, 'KWD')
      expect(major).toBe(original)
    })
  })
})
