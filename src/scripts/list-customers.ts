import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'customers',
    limit: 100
  })

  console.log(`Found ${result.docs.length} customers in DB:`)
  result.docs.forEach(doc => {
    console.log(`- Email: ${doc.email}, Status: ${doc.status}, Verified: ${(doc as any)._verified}`)
  })

  process.exit(0)
}

run().catch(console.error)
