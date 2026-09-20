import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function check() {
  const payload = await getPayload({ config })
  const exp = await payload.findByID({
    collection: 'experiences',
    id: 1955,
    depth: 0,
  })
  console.log('Direct findByID accommodations type:', Array.isArray(exp.accommodations))
  console.log('Direct findByID accommodations count:', exp.accommodations?.length)
  console.log('Stay 1 options count:', exp.accommodations?.[0]?.options?.length)
  console.log('Stay 1 option 1 roomRates:', exp.accommodations?.[0]?.options?.[0]?.roomRates)
  process.exit(0)
}

check().catch((e) => {
  console.error(e)
  process.exit(1)
})
