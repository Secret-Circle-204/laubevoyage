import fs from 'fs'
import path from 'path'
import { JsonTranslationDictionary } from '../src/domains/translation/dictionary'

const LOCALES = ['en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'zh', 'ja', 'pt', 'nl', 'pl', 'fi']
const dictDir = path.resolve(process.cwd(), 'src/dictionaries')
const dict = new JsonTranslationDictionary()

console.log('=== SEARCH DICTIONARY PARITY AUDIT ===')

const enPath = path.join(dictDir, 'en.json')
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
const expectedSearchKeys = Object.keys(enData.search || {})

console.log(`Expected Search Keys Count: ${expectedSearchKeys.length}`)
console.log('Expected Search Keys:', expectedSearchKeys)

let allPassed = true

for (const loc of LOCALES) {
  const filePath = path.join(dictDir, `${loc}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const searchObj = data.search || {}
  const keys = Object.keys(searchObj)

  const missing = expectedSearchKeys.filter((k) => !(k in searchObj) || searchObj[k] === '')
  const extra = keys.filter((k) => !expectedSearchKeys.includes(k))

  if (missing.length > 0 || extra.length > 0) {
    console.error(`❌ [${loc}] PARITY ERROR: missing: ${missing.length}, extra: ${extra.length}`)
    if (missing.length > 0) console.error(`   Missing in ${loc}:`, missing)
    if (extra.length > 0) console.error(`   Extra in ${loc}:`, extra)
    allPassed = false
  } else {
    // Verify each key via JsonTranslationDictionary
    for (const k of expectedSearchKeys) {
      const fullKey = `search.${k}`
      const val = dict.get(loc, fullKey)
      if (!val || val === fullKey) {
        console.error(`❌ [${loc}] Lookup failed for key: ${fullKey}`)
        allPassed = false
      }
    }
    console.log(`✅ [${loc}] 100% key parity (${keys.length} keys, 0 missing, 0 extra, 0 empty)`)
  }
}

if (allPassed) {
  console.log('\n🎉 ALL 13 DICTIONARIES HAVE 100% SEARCH KEY PARITY!')
} else {
  process.exit(1)
}
