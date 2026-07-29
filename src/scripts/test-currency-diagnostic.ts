import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '../domains/factory'

async function run() {
  console.log('🧪 Running Localization resolution diagnostics...')
  const payload = await getPayload({ config })
  const { localization } = await getDomainServices()

  // Simulate German tourist in Egypt
  console.log('\n--- Test Case 1: German visitor in Egypt (Accept-Language: de) ---')
  const ctxDE = await localization.buildContext({
    acceptLanguage: 'de-DE,de;q=0.9',
    geoCountry: 'EG',
  })
  console.log('Result DE:')
  console.log(`- Resolved Language: ${ctxDE.language}`)
  console.log(`- Resolved Currency: ${ctxDE.currency}`)
  console.log(`- Resolved Country: ${ctxDE.country}`)

  // Simulate Japanese tourist in Egypt
  console.log('\n--- Test Case 2: Japanese visitor in Egypt (Accept-Language: ja) ---')
  const ctxJA = await localization.buildContext({
    acceptLanguage: 'ja-JP,ja;q=0.9',
    geoCountry: 'EG',
  })
  console.log('Result JA:')
  console.log(`- Resolved Language: ${ctxJA.language}`)
  console.log(`- Resolved Currency: ${ctxJA.currency}`)
  console.log(`- Resolved Country: ${ctxJA.country}`)

  // Simulate Chinese tourist in Egypt
  console.log('\n--- Test Case 3: Chinese visitor in Egypt (Accept-Language: zh-CN) ---')
  const ctxZH = await localization.buildContext({
    acceptLanguage: 'zh-CN,zh;q=0.9',
    geoCountry: 'EG',
  })
  console.log('Result ZH:')
  console.log(`- Resolved Language: ${ctxZH.language}`)
  console.log(`- Resolved Currency: ${ctxZH.currency}`)
  console.log(`- Resolved Country: ${ctxZH.country}`)

  process.exit(0)
}

run().catch((err) => {
  console.error('Diagnostic error:', err)
  process.exit(1)
})
