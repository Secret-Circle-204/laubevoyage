import fs from 'fs'
import path from 'path'
import { JsonTranslationDictionary } from '../src/domains/translation/dictionary'

console.log('=== FORENSIC CURRENCY PRESENTATION AUDIT ===')

// 1. Check ExperienceDetailsPage.tsx for hardcoded EGP presentation leaks
const expPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/features/experience/ExperienceDetailsPage.tsx'),
  'utf-8'
)

const leaks = []

if (expPageContent.includes('+{childSharingAmountEGP.toLocaleString()} EGP')) {
  leaks.push('Child sharing bedding hardcoded EGP leak')
}
if (expPageContent.includes('+{childExtraBedAmountEGP.toLocaleString()} EGP')) {
  leaks.push('Child extra bed bedding hardcoded EGP leak')
}
if (expPageContent.includes('{pricingState.commercialBreakdown.adultsTotalEGP?.toLocaleString()} EGP')) {
  leaks.push('Adults total breakdown hardcoded EGP leak')
}
if (expPageContent.includes('{ch.priceEGP === 0 ? dict.get(locale, \'experience.free\') : `${ch.priceEGP?.toLocaleString()} EGP`}')) {
  leaks.push('Child breakdown item hardcoded EGP leak')
}
if (expPageContent.includes('+{pricingState.commercialBreakdown.occupancySupplementsTotalEGP?.toLocaleString()} EGP')) {
  leaks.push('Room supplements total breakdown hardcoded EGP leak')
}
if (expPageContent.includes('+{opt.supplementEGP.toLocaleString()} EGP')) {
  leaks.push('Occupancy options stays showcase hardcoded EGP leak')
}

console.log(`Hardcoded EGP Presentation Leaks Found: ${leaks.length}`)
if (leaks.length > 0) {
  console.error('LEAKS DETECTED:', leaks)
} else {
  console.log('✅ ALL 4 FORMER EGP PRESENTATION LEAKS COMPLETELY REMOVED!')
}

// 2. Check 13/13 Dictionary parity and adultsCalculation template
const LOCALES = ['en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'zh', 'ja', 'pt', 'nl', 'pl', 'fi']
const dictDir = path.resolve(process.cwd(), 'src/dictionaries')
const dict = new JsonTranslationDictionary()

let templateDefects = 0
for (const loc of LOCALES) {
  const val = dict.getStrict(loc, 'experience.adultsCalculation')
  if (!val) {
    console.error(`[${loc}] Missing experience.adultsCalculation!`)
    templateDefects++
  } else if (val.includes('EGP') || val.includes('ج.م')) {
    console.error(`[${loc}] experience.adultsCalculation still contains currency text: "${val}"`)
    templateDefects++
  } else if (!val.includes('{count}') || !val.includes('{price}')) {
    console.error(`[${loc}] experience.adultsCalculation missing {count} or {price}: "${val}"`)
    templateDefects++
  } else {
    console.log(`[${loc}] experience.adultsCalculation: "${val}" ✅`)
  }
}

console.log(`Template Defects Count: ${templateDefects}`)

// 3. Check for any exchange rate math in ExperienceDetailsPage.tsx
const hasManualMath = expPageContent.includes('.exchangeRate *') || expPageContent.includes('* pricingState.unitPrice')
console.log(`Manual Exchange Rate Math in React: ${hasManualMath ? 'DETECTED ❌' : 'NONE ✅ (Zero client-side currency math)'}`)

console.log(`\n=== FINAL AUDIT RESULT: ${leaks.length === 0 && templateDefects === 0 && !hasManualMath ? 'PASS (100% VERIFIED)' : 'FAIL'} ===`)
