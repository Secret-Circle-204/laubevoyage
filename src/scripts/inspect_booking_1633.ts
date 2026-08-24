import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'currencies',
    limit: 100,
  })
  console.log('=== CMS CURRENCIES ===')
  for (const doc of result.docs) {
    console.log(JSON.stringify(doc, null, 2))
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
