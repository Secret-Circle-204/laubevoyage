import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

function toLexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              text: text || '',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
            },
          ],
          direction: 'ltr',
        },
      ],
      direction: 'ltr',
    },
  }
}

async function run() {
  const payload = await getPayload({ config })

  console.log('🔄 --- START LEXICAL FIELDS MIGRATION ---')

  // 1. Countries
  console.log('Migrating countries...')
  const countries = await payload.find({
    collection: 'countries',
    limit: 1000,
  })
  for (const doc of countries.docs) {
    if (typeof doc.description === 'string') {
      console.log(`Fixing description for country: ${doc.name}`)
      await payload.update({
        collection: 'countries',
        id: doc.id,
        data: {
          description: toLexical(doc.description),
        } as any,
      })
    }
  }

  // 2. Cities
  console.log('Migrating cities...')
  const cities = await payload.find({
    collection: 'cities',
    limit: 1000,
  })
  for (const doc of cities.docs) {
    if (typeof doc.description === 'string') {
      console.log(`Fixing description for city: ${doc.name}`)
      await payload.update({
        collection: 'cities',
        id: doc.id,
        data: {
          description: toLexical(doc.description),
        } as any,
      })
    }
  }

  // 3. Experiences
  console.log('Migrating experiences...')
  const experiences = await payload.find({
    collection: 'experiences',
    limit: 1000,
  })
  for (const doc of experiences.docs) {
    const updateData: Record<string, any> = {}
    let needsUpdate = false

    if (typeof doc.description === 'string') {
      console.log(`Fixing description for experience: ${doc.title}`)
      updateData.description = toLexical(doc.description)
      needsUpdate = true
    }

    if (typeof doc.policies === 'string') {
      console.log(`Fixing policies for experience: ${doc.title}`)
      updateData.policies = toLexical(doc.policies)
      needsUpdate = true
    }

    if (needsUpdate) {
      await payload.update({
        collection: 'experiences',
        id: doc.id,
        data: updateData as any,
      })
    }
  }

  console.log('🔄 --- LEXICAL FIELDS MIGRATION COMPLETED ---')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
