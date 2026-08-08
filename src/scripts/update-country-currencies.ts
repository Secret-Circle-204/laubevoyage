// @ts-nocheck
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const COUNTRY_CONFIG_MAP: Record<string, { currencyIso: string; timezone: string }> = {
  DE: { currencyIso: 'EUR', timezone: 'Europe/Berlin' },
  FR: { currencyIso: 'EUR', timezone: 'Europe/Paris' },
  ES: { currencyIso: 'EUR', timezone: 'Europe/Madrid' },
  IT: { currencyIso: 'EUR', timezone: 'Europe/Rome' },
  GR: { currencyIso: 'EUR', timezone: 'Europe/Athens' },
  SA: { currencyIso: 'SAR', timezone: 'Asia/Riyadh' },
  AE: { currencyIso: 'AED', timezone: 'Asia/Dubai' },
  US: { currencyIso: 'USD', timezone: 'America/New_York' },
  EG: { currencyIso: 'EGP', timezone: 'Africa/Cairo' },
  GB: { currencyIso: 'GBP', timezone: 'Europe/London' },
  JP: { currencyIso: 'JPY', timezone: 'Asia/Tokyo' },
  TH: { currencyIso: 'USD', timezone: 'Asia/Bangkok' },
  TR: { currencyIso: 'EUR', timezone: 'Europe/Istanbul' },
}

async function run() {
  console.log('🌍 Updating Countries currency relationships in Payload CMS DB...')
  const payload = await getPayload({ config })

  // 1. Build ISO -> Currency Doc ID map
  const { docs: currencies } = await payload.find({
    collection: 'currencies',
    limit: 100,
  })

  const currencyIdMap = new Map<string, number | string>()
  for (const curr of currencies) {
    currencyIdMap.set(curr.isoCode.toUpperCase(), curr.id)
  }

  // 2. Query and update all Countries
  const { docs: countries } = await payload.find({
    collection: 'countries',
    limit: 100,
  })

  for (const country of countries) {
    const code = country.code.toUpperCase()
    const cfg = COUNTRY_CONFIG_MAP[code]
    if (cfg) {
      const currencyId = currencyIdMap.get(cfg.currencyIso)
      if (currencyId) {
        await payload.update({
          collection: 'countries',
          id: country.id,
          data: {
            currency: currencyId,
            timezone: cfg.timezone,
            measurementSystem: 'metric',
            weekStart: code === 'US' ? 0 : code === 'SA' || code === 'AE' || code === 'EG' ? 6 : 1,
          },
        })
        console.log(`   ✅ Linked Country ${country.name} (${code}) ──► Currency ${cfg.currencyIso} (ID: ${currencyId})`)
      }
    }
  }

  console.log('✨ Finished updating Countries geographic master data!')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Error updating countries:', err)
  process.exit(1)
})
