import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'd6cc14bbcffa29b19dcd1a26'
process.env.VITEST = 'true'
import { ExperienceDetailsLoader } from '../src/application/experience/loaders-details'

async function check() {
  console.log('=== LOADING SLUG #1955 (transcontinental-grand-horizon-cairo-dubai-paris-11d) ===')
  const data1955 = await ExperienceDetailsLoader.loadBySlug(
    'transcontinental-grand-horizon-cairo-dubai-paris-11d',
    { locale: 'en', currency: 'EGP', adults: 2 }
  )
  console.log('Title:', data1955?.title)
  console.log('Stays count:', data1955?.accommodations?.length)
  data1955?.accommodations?.forEach((stay) => {
    console.log(`Stay #${stay.order} (${stay.nights} nights):`)
    stay.options.forEach((opt) => {
      console.log(`  Option ID: ${opt.id}, Hotel: "${opt.propertyName}", Category: "${opt.roomCategory}"`)
    })
  })

  console.log('\n=== LOADING SLUG #1952 (royal-upper-egypt-heritage-winter-palace-sonesta-6d) ===')
  const data1952 = await ExperienceDetailsLoader.loadBySlug(
    'royal-upper-egypt-heritage-winter-palace-sonesta-6d',
    { locale: 'en', currency: 'EGP', adults: 2 }
  )
  console.log('Title:', data1952?.title)
  console.log('Stays count:', data1952?.accommodations?.length)
  data1952?.accommodations?.forEach((stay) => {
    console.log(`Stay #${stay.order} (${stay.nights} nights):`)
    stay.options.forEach((opt) => {
      console.log(`  Option ID: ${opt.id}, Hotel: "${opt.propertyName}", Category: "${opt.roomCategory}"`)
    })
  })

  process.exit(0)
}

check().catch((e) => {
  console.error(e)
  process.exit(1)
})
