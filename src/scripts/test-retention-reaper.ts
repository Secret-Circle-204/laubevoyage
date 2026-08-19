import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { bootstrapWorkerApplication } from '../domains/bootstrap'
import { CronDispatcher } from '../application/jobs/cron-dispatcher'

async function main() {
  console.log("Initializing Payload...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.\n")

  console.log("Bootstrapping Worker Application (this starts CronDispatcher.startWorker())...")
  await bootstrapWorkerApplication()
  console.log("Worker Application bootstrapped.\n")

  const email = `retention-test-${Date.now()}@test.com`
  console.log(`Creating test customer with email: ${email} (status: pending_verification, expired)...`)

  // 1. Create expired unverified customer
  const now = Date.now()
  const customer = await payload.create({
    collection: 'customers',
    data: {
      email,
      firstName: 'Retention',
      lastName: 'Test',
      password: 'password123',
      status: 'pending_verification',
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // Created 4 hours ago
      verificationExpiresAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // Expired 1 hour ago
    }
  } as any)

  console.log(`Test customer created with ID: ${customer.id}`)

  // 2. Verify customer exists
  let check = await payload.findByID({
    collection: 'customers',
    id: customer.id
  })

  if (check) {
    console.log(`✅ Customer successfully created and exists in database: ${check.email}`)
  } else {
    throw new Error("❌ Customer was not created!")
  }

  console.log("\nExecuting Hourly Scheduled Jobs (including data_retention_purge)...")
  const cronResult = await CronDispatcher.runHourlyJob()
  console.log(`Cron execution completed. Tasks executed: ${cronResult.executedTasks.join(', ')}`)

  // 3. Verify customer is gone
  console.log("Checking if the customer has been deleted...")
  let deleted = false
  try {
    const doc = await payload.findByID({
      collection: 'customers',
      id: customer.id
    })
    if (!doc) {
      deleted = true
    }
  } catch (err: unknown) {
    // Payload throws an error if document is not found
    deleted = true
  }

  if (deleted) {
    console.log(`\n✅ SUCCESS: Customer with ID ${customer.id} has been automatically purged by data_retention_purge!`)
  } else {
    console.log(`\n❌ FAILURE: Customer still exists!`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
