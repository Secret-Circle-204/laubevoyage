import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { bootstrapWebApplication } from '../domains/bootstrap'
import { EventOutboxService } from '../domains/events/outbox'

async function main() {
  console.log("Initializing Payload...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.")

  console.log("Bootstrapping Web Application...")
  await bootstrapWebApplication()

  const services = await getDomainServices()

  // Generate unique emails to avoid conflicts
  const successEmail = `atomic-success-${Date.now()}@test.com`
  const rollbackEmail = `atomic-rollback-${Date.now()}@test.com`

  console.log("\n=================== TEST CASE 1: Successful Registration Atomicity ===================")
  console.log(`Registering customer: ${successEmail}...`)
  
  const customer = await services.customer.registerCustomer(
    successEmail,
    'Atomic',
    'Success',
    'password123',
    { preferredLanguage: 'en', preferredCurrency: 'USD' },
    { eventSource: 'domain' }
  )

  console.log(`Customer created with ID: ${customer.customerId}`)

  // Verify Customer document exists in database
  const customerDoc = await payload.findByID({
    collection: 'customers',
    id: customer.customerId,
  })
  if (customerDoc) {
    console.log(`✅ Customer document exists in database: ${customerDoc.email}`)
  } else {
    throw new Error("❌ Customer document does not exist in database!")
  }

  // Verify Outbox Event exists in database
  const outboxEvents = await payload.find({
    collection: 'event-outbox',
    where: {
      eventType: { equals: 'CUSTOMER_REGISTERED' },
      'payload.customerId': { equals: customer.customerId }
    }
  })

  if (outboxEvents.totalDocs === 1) {
    console.log(`✅ Outbox event exists in database: ${outboxEvents.docs[0].eventId}`)
    console.log(`   Event Status: ${outboxEvents.docs[0].status}`)
  } else {
    throw new Error(`❌ Expected exactly 1 outbox event, found ${outboxEvents.totalDocs}`)
  }
  console.log("✅ TEST CASE 1 PASSED!")

  console.log("\n=================== TEST CASE 2: Transactional Rollback on Outbox Failure ===================")
  console.log("Simulating Outbox write failure by overriding EventOutboxRepository.add...")
  
  const outboxService = EventOutboxService.getInstance()
  const originalAdd = (outboxService as any).outboxRepository.add

  // Override repository add to throw an error
  ;(outboxService as any).outboxRepository.add = async () => {
    console.log("[Mocked Outbox Repository] Intentionally throwing error to simulate database crash during outbox write...")
    throw new Error("Simulated Database Crash during Outbox write")
  }

  console.log(`Registering customer: ${rollbackEmail}...`)
  let registrationFailed = false
  try {
    await services.customer.registerCustomer(
      rollbackEmail,
      'Atomic',
      'Rollback',
      'password123',
      { preferredLanguage: 'en', preferredCurrency: 'USD' },
      { eventSource: 'domain' }
    )
  } catch (err: any) {
    console.log(`Caught expected error: ${err.message}`)
    registrationFailed = true
  }

  // Restore the original add method
  ;(outboxService as any).outboxRepository.add = originalAdd

  if (!registrationFailed) {
    throw new Error("❌ Registration succeeded despite outbox write failure! Atomicity violated.")
  }

  // Verify that the customer document was NOT saved (rolled back)
  const customersInDb = await payload.find({
    collection: 'customers',
    where: {
      email: { equals: rollbackEmail }
    }
  })

  if (customersInDb.totalDocs === 0) {
    console.log("✅ Customer document successfully rolled back and does not exist in the database!")
  } else {
    throw new Error("❌ Customer document was persisted despite registration failing! Rollback failed.")
  }

  console.log("✅ TEST CASE 2 PASSED!")
  console.log("\nAll registration atomicity tests passed successfully!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
