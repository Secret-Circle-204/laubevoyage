import type { Payload } from 'payload'

export interface CurrencySeedData {
  isoCode: string
  numericCode: number
  name: string
  symbol: string
  nativeSymbol?: string
  decimals: number
  isActive: boolean
  displayOrder: number
  isDefault: boolean
}

export const RECOGNIZED_CURRENCIES: CurrencySeedData[] = [
  { isoCode: 'EGP', numericCode: 818, name: 'Egyptian Pound', symbol: 'EGP', nativeSymbol: 'ج.م', decimals: 2, isActive: true, displayOrder: 1, isDefault: true },
  { isoCode: 'USD', numericCode: 840, name: 'US Dollar', symbol: '$', nativeSymbol: '$', decimals: 2, isActive: true, displayOrder: 2, isDefault: false },
  { isoCode: 'EUR', numericCode: 978, name: 'Euro', symbol: '€', nativeSymbol: '€', decimals: 2, isActive: true, displayOrder: 3, isDefault: false },
  { isoCode: 'GBP', numericCode: 826, name: 'British Pound', symbol: '£', nativeSymbol: '£', decimals: 2, isActive: true, displayOrder: 4, isDefault: false },
  { isoCode: 'SAR', numericCode: 682, name: 'Saudi Riyal', symbol: 'SAR', nativeSymbol: 'ر.س', decimals: 2, isActive: true, displayOrder: 5, isDefault: false },
  { isoCode: 'AED', numericCode: 784, name: 'UAE Dirham', symbol: 'AED', nativeSymbol: 'د.إ', decimals: 2, isActive: true, displayOrder: 6, isDefault: false },
  { isoCode: 'KWD', numericCode: 414, name: 'Kuwaiti Dinar', symbol: 'KWD', nativeSymbol: 'د.ك', decimals: 3, isActive: true, displayOrder: 7, isDefault: false },
  { isoCode: 'QAR', numericCode: 634, name: 'Qatari Riyal', symbol: 'QAR', nativeSymbol: 'ر.ق', decimals: 2, isActive: true, displayOrder: 8, isDefault: false },
  { isoCode: 'BHD', numericCode: 48, name: 'Bahraini Dinar', symbol: 'BHD', nativeSymbol: 'د.ب', decimals: 3, isActive: true, displayOrder: 9, isDefault: false },
  { isoCode: 'OMR', numericCode: 512, name: 'Omani Rial', symbol: 'OMR', nativeSymbol: 'ر.ع.', decimals: 3, isActive: true, displayOrder: 10, isDefault: false },
  { isoCode: 'JPY', numericCode: 392, name: 'Japanese Yen', symbol: '¥', nativeSymbol: '¥', decimals: 0, isActive: false, displayOrder: 11, isDefault: false },
  { isoCode: 'CHF', numericCode: 756, name: 'Swiss Franc', symbol: 'CHF', nativeSymbol: 'CHF', decimals: 2, isActive: false, displayOrder: 12, isDefault: false },
  { isoCode: 'CAD', numericCode: 124, name: 'Canadian Dollar', symbol: 'CA$', nativeSymbol: '$', decimals: 2, isActive: false, displayOrder: 13, isDefault: false },
  { isoCode: 'AUD', numericCode: 36, name: 'Australian Dollar', symbol: 'AU$', nativeSymbol: '$', decimals: 2, isActive: false, displayOrder: 14, isDefault: false },
  { isoCode: 'CNY', numericCode: 156, name: 'Chinese Yuan', symbol: 'CN¥', nativeSymbol: '¥', decimals: 2, isActive: false, displayOrder: 15, isDefault: false },
]

export async function seedCurrencies(payload: Payload): Promise<void> {
  console.log('💱 [Seed] Seeding Master Currencies Catalog...')
  let seededCount = 0

  for (const currency of RECOGNIZED_CURRENCIES) {
    try {
      await payload.create({
        collection: 'currencies',
        data: currency,
      })
      seededCount++
    } catch {
      // Currency already exists in catalog
    }
  }

  console.log(`   ✅ Currencies Catalog initialized (${seededCount} new currencies created).`)
}
