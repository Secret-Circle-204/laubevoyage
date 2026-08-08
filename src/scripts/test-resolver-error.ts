import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'

async function run() {
  const payload = await getPayload({ config })

  const email = 'test-customer-resolver@laubevoyage.com'
  const password = 'Customer@123'

  // Clean up any existing test user
  await payload.delete({
    collection: 'customers',
    where: {
      email: { equals: email }
    }
  })

  // Create test customer
  console.log('Creating test customer...')
  const newCustomer = await payload.create({
    collection: 'customers',
    data: {
      email,
      password,
      firstName: 'Test',
      lastName: 'Resolver',
      phone: '+201000000000',
      status: 'active',
      _verified: true,
      loyalty: {
        tier: 'explorer',
        points: 100,
        totalSpent: 0,
      },
    },
  })

  // Login
  console.log('Logging in...')
  const loginResult = await payload.login({
    collection: 'customers',
    data: {
      email,
      password
    }
  })

  const token = loginResult.token
  const customerId = Number(loginResult.user?.id)

  console.log('Testing SessionResolver steps manually for customer ID:', customerId)

  try {
    console.log('Step 1: payload.auth...')
    const authResult = await payload.auth({
      headers: new Headers({
        cookie: `payload-token=${token}`
      })
    })
    console.log('Auth user ID:', authResult.user?.id)

    console.log('Step 2: getDomainServices...')
    const services = await getDomainServices()

    console.log('Step 3: customer.getProfile...')
    const profile = await services.customer.getProfile(customerId)
    console.log('Profile resolved:', profile.email)

    console.log('Step 4: loyalty.getCustomerBalance...')
    const balance = await services.loyalty.getCustomerBalance(customerId)
    console.log('Balance resolved:', balance)

    console.log('✅ ALL STEPS PASSED SUCCESSFULLY!')
  } catch (err: any) {
    console.error('❌ STEP FAILED WITH ERROR:', err)
  }

  // Clean up
  await payload.delete({
    collection: 'customers',
    where: {
      email: { equals: email }
    }
  })

  process.exit(0)
}

run().catch(console.error)
