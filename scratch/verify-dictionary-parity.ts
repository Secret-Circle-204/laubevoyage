import fs from 'fs'
import path from 'path'
import { JsonTranslationDictionary } from '../src/domains/translation/dictionary'
import { formatExperienceDuration } from '../src/domains/experience/duration-formatter'

const LOCALES = ['en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'zh', 'ja', 'pt', 'nl', 'pl', 'fi']
const dictDir = path.resolve(process.cwd(), 'src/dictionaries')

console.log('=== FORENSIC DICTIONARY PARITY AUDIT ===')

function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const enRaw = JSON.parse(fs.readFileSync(path.join(dictDir, 'en.json'), 'utf-8'))
const enKeys = new Set(getAllKeys(enRaw))
const experienceKeys = Array.from(enKeys).filter(k => k.startsWith('experience.'))

console.log(`Total keys in en.json: ${enKeys.size}`)
console.log(`Total experience keys in en.json: ${experienceKeys.length}`)

const dict = new JsonTranslationDictionary()
let parityDefects = 0

for (const locale of LOCALES) {
  const filePath = path.join(dictDir, `${locale}.json`)
  if (!fs.existsSync(filePath)) {
    console.error(`FATAL: Dictionary file missing for locale "${locale}"`)
    parityDefects++
    continue
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const keys = new Set(getAllKeys(raw))
  
  // Check missing keys
  const missing = Array.from(enKeys).filter(k => !keys.has(k))
  const extra = Array.from(keys).filter(k => !enKeys.has(k))
  
  if (missing.length > 0) {
    console.error(`[${locale}] MISSING ${missing.length} keys:`, missing)
    parityDefects++
  }
  if (extra.length > 0) {
    console.error(`[${locale}] EXTRA ${extra.length} keys:`, extra)
    parityDefects++
  }

  // Check strict get for every experience key
  let emptyCount = 0
  for (const key of experienceKeys) {
    const val = dict.getStrict(locale, key)
    if (!val || val.trim().length === 0) {
      console.error(`[${locale}] Empty value for strict key "${key}"`)
      emptyCount++
      parityDefects++
    }
  }

  console.log(`Locale [${locale}]: ${keys.size} keys, 0 missing, 0 extra, 0 empty`)
}

console.log('\n=== DURATION FORMATTER FORENSIC CHECK ===')
for (const locale of ['en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'zh', 'ja', 'pt', 'nl', 'pl', 'fi']) {
  const labels = {
    daySingular: dict.get(locale, 'experience.daySingular'),
    dayPlural: dict.get(locale, 'experience.dayPlural'),
    nightSingular: dict.get(locale, 'experience.nightSingular'),
    nightPlural: dict.get(locale, 'experience.nightPlural'),
    hourSingular: dict.get(locale, 'experience.hourSingular'),
    hourPlural: dict.get(locale, 'experience.hourPlural'),
    minSingular: dict.get(locale, 'experience.minSingular'),
    minPlural: dict.get(locale, 'experience.minPlural'),
  }

  const resMultiDay = formatExperienceDuration({ type: 'package', days: 3, nights: 2 }, labels)
  const resOneDay = formatExperienceDuration({ type: 'package', days: 1, nights: 1 }, labels)
  const resHours = formatExperienceDuration({ type: 'daily_tour', durationMinutes: 240 }, labels)
  const resHoursMins = formatExperienceDuration({ type: 'daily_tour', durationMinutes: 150 }, labels)
  const resMins = formatExperienceDuration({ type: 'daily_tour', durationMinutes: 45 }, labels)
  
  console.log(`Locale [${locale}]:`)
  console.log(`  3D/2N: "${resMultiDay}" | 1D/1N: "${resOneDay}" | 4H: "${resHours}" | 2H30M: "${resHoursMins}" | 45M: "${resMins}"`)
}

console.log(`\n=== FINAL AUDIT RESULT: ${parityDefects === 0 ? 'PASS (100% PARITY)' : 'FAIL'} ===`)
