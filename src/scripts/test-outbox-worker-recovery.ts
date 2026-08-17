import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { bootstrapWorkerApplication } from '../domains/bootstrap'
import { EventOutboxService } from '../domains/events/outbox'

async function main() {
  console.log("Initializing Payload...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.")

  console.log("Bootstrapping Worker Application (this starts the background OutboxPublisherWorker)...")
  await bootstrapWorkerApplication()

  const services = await getDomainServices()
  const customerId = 53
  const eventId = `test_worker_recovery_${Date.now()}`

  console.log("\n=================== TEST CASE: Outbox Worker Recovery ===================")
  
  // Step 1: Reset customer 53 points to 0
  console.log("Resetting customer 53's points to 0...")
  await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      loyalty: {
        points: 0,
        tier: 'explorer'
      }
    }
  })

  // Verify points are 0
  const initialCustomer = await services.customer.getById(customerId)
  console.log(`Initial points: ${initialCustomer.loyalty?.points}`)
  if (initialCustomer.loyalty?.points !== 0) {
    throw new Error("❌ Reset failed!")
  }

  // Step 2: Manually insert a PENDING event into the outbox
  console.log(`Manually inserting pending CUSTOMER_REGISTERED event (ID: ${eventId}) into the database...`)
  await payload.create({
    collection: 'event-outbox',
    data: {
      eventId,
      correlationId: `corr_${eventId}`,
      eventType: 'CUSTOMER_REGISTERED',
      eventVersion: 1,
      aggregateType: 'Customer',
      aggregateId: String(customerId),
      payload: {
        type: 'CUSTOMER_REGISTERED',
        eventId,
        correlationId: `corr_${eventId}`,
        eventVersion: 1,
        customerId,
        email: 'test-2@mail.com'
      } as any,
      status: 'pending',
      retryCount: 0,
      occurredAt: new Date().toISOString()
    }
  })

  console.log("Event inserted in pending state. Waiting 5 seconds for the background worker to poll and process it...")
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Step 3: Fetch customer 53 and verify points are now 100
  const updatedCustomer = await services.customer.getById(customerId)
  console.log(`Customer points after worker execution: ${updatedCustomer.loyalty?.points}`)

  if (updatedCustomer.loyalty?.points === 100) {
    console.log("✅ Outbox worker successfully recovered the pending event and granted the welcome points!")
  } else {
    throw new Error("❌ Outbox worker failed to process the pending event and grant points!")
  }

  // Verify outbox event is marked as published
  const outboxRecord = await payload.find({
    collection: 'event-outbox',
    where: {
      eventId: { equals: eventId }
    }
  })
  console.log(`Outbox event status in database: ${outboxRecord.docs[0]?.status}`)
  if (outboxRecord.docs[0]?.status === 'published') {
    console.log("✅ Outbox event successfully transitioned to 'published' status!")
  } else {
    throw new Error(`❌ Outbox event remained in status: ${outboxRecord.docs[0]?.status}`)
  }

  console.log("✅ Outbox Worker Recovery test passed successfully!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
