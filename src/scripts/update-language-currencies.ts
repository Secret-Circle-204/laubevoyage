import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  en: 'USD',
  ar: 'EGP',
  fr: 'EUR',
  ja: 'JPY',
  de: 'EUR',
  zh: 'CNY',
  ru: 'USD', // Fallback to USD since RUB is not configured in the CMS
  es: 'EUR',
  it: 'EUR',
  nl: 'EUR',
  fi: 'EUR',
  pt: 'EUR',
  pl: 'EUR', // Fallback to EUR if PLN is not configured
}

async function run() {
  console.log('🌐 Updating Languages preferredDisplayCurrency relationships in Payload CMS DB...')
  const payload = await getPayload({ config })

  // 1. Build ISO Code -> Currency Doc ID map
  const { docs: currencies } = await payload.find({
    collection: 'currencies',
    limit: 100,
  })

  console.log('Available currencies in DB:', currencies.map(c => c.isoCode).join(', '))

  const currencyIdMap = new Map<string, number | string>()
  for (const curr of currencies) {
    currencyIdMap.set(curr.isoCode.toUpperCase(), curr.id)
  }

  // 2. Query and update all Languages
  const { docs: languages } = await payload.find({
    collection: 'languages',
    limit: 100,
  })

  for (const lang of languages) {
    const code = lang.code.toLowerCase().trim()
    const targetCurrencyIso = LANGUAGE_CURRENCY_MAP[code]
    if (targetCurrencyIso) {
      const currencyId = currencyIdMap.get(targetCurrencyIso)
      if (currencyId) {
        await payload.update({
          collection: 'languages',
          id: lang.id,
          data: {
            preferredDisplayCurrency: currencyId,
          },
        })
        console.log(`   ✅ Linked Language ${lang.name} (${code}) ──► Preferred Currency ${targetCurrencyIso} (ID: ${currencyId})`)
      } else {
        console.warn(`   ⚠️ Target currency ${targetCurrencyIso} for language ${lang.name} is not found in currencies collection.`)
      }
    } else {
      console.log(`   ℹ️ No preferred currency map found for language ${lang.name} (${code})`)
    }
  }

  console.log('✨ Finished updating Languages preferred display currency data!')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Error updating languages:', err)
  process.exit(1)
})
