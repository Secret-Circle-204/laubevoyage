import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'customers',
    where: {
      email: { equals: 'hamzamode202@gmail.com' }
    }
  })

  if (result.docs.length === 0) {
    console.log('Customer hamzamode202@gmail.com not found')
  } else {
    const customer = result.docs[0]
    console.log('Customer Details:')
    console.log('Email:', customer.email)
    console.log('Status:', customer.status)
    console.log('_verified:', (customer as any)._verified)
    console.log('failedLoginAttempts:', customer.failedLoginAttempts)
    console.log('lockedUntil:', customer.lockedUntil)
  }

  process.exit(0)
}

run().catch(console.error)
