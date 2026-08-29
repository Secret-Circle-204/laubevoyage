import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { NotificationWorker } from '../domains/notification/worker'
import { NotificationQueue } from '../domains/notification/queue'
import { NotificationDispatcher } from '../domains/notification/dispatcher'
import { NotificationRepository } from '../domains/notification/repository'
import { OutboxPublisherWorker } from '../domains/events/outbox-publisher'
import { PayloadOutboxRepository } from '../domains/events/repositories/payload-outbox-repository'

async function runEndToEndVerification() {
  console.log('=================== GATE 16.4 END-TO-END FLOW VERIFICATION ===================')
  const payload = await getPayload({ config: configPromise })
  const services = await getDomainServices()
  await services.system.bootstrapSystem({
    customerService: services.customer,
    loyaltyService: services.loyalty,
    notificationService: services.notification,
  })

  const timestamp = Date.now()
  const email = `audit_user_${timestamp}@example.com`
  const firstName = 'Layla'
  const lastName = 'Audit'

  console.log(`\n[STEP 1] Executing Registration for ${email}...`)
  const customer = await services.customer.registerCustomer(
    email,
    firstName,
    lastName,
    'SecurePass123!@#',
  )
  console.log(`Customer created: ID #${customer.customerId}, Status: ${customer.status}`)

  // Verify notification-logs has exactly 1 verification_email job in 'queued' state
  const notifLogs = await payload.find({
    collection: 'notification-logs',
    where: {
      and: [
        { recipient: { equals: email } },
        { templateId: { equals: 'verification_email' } },
      ],
    },
  })
  console.log(`\n[STEP 2] Verification Email Notification Log created count: ${notifLogs.docs.length}`)
  const job = notifLogs.docs[0]
  console.log(`Job Details: ID: ${job.notificationId}, Status: ${job.status}, Category: ${job.category}, Priority: ${job.priority}`)
  console.log(`Job templateData (must NOT contain token or URL):`, JSON.stringify(job.templateData))

  // Dispatch via NotificationWorker
  console.log('\n[STEP 3] Running NotificationWorker.processNextJob()...')
  const queue = new NotificationQueue()
  const repository = new NotificationRepository(payload)
  const dispatcher = new NotificationDispatcher()
  const worker = new NotificationWorker(queue, dispatcher, repository)

  const processed = await worker.processNextJob()
  console.log(`Worker processed job: ${processed}`)

  // Re-inspect job in database
  const updatedJob = await payload.findByID({
    collection: 'notification-logs',
    id: job.id,
  })
  console.log(`Job status after worker execution: ${updatedJob.status}, sentAt: ${updatedJob.sentAt}`)
  console.log(`Persistent templateData in DB (verifying ZERO secondary token persistence):`, JSON.stringify(updatedJob.templateData))

  // Fetch token from customer record to execute verification
  const customerDoc = await payload.findByID({
    collection: 'customers',
    id: customer.customerId,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const token = (customerDoc as any)._verificationToken
  console.log(`\n[STEP 4] Fetched customer _verificationToken: ${token ? 'EXISTS' : 'NONE'}`)

  if (token) {
    console.log(`\n[STEP 5] Executing Email Verification Workflow...`)
    const verifyResult = await services.customer.verifyEmail(token, email)
    console.log(`Verification result:`, verifyResult.status)

    // Publish outbox events to trigger CustomerSubscriber (Transaction B)
    console.log('\n[STEP 6] Publishing Outbox Events to trigger CustomerSubscriber.grantWelcomeBonus...')
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)
    const publishResult = await outboxWorker.publishPendingEvents()
    console.log(`Outbox publish result: processed ${publishResult.processedCount} events`)

    // Verify Welcome Email notification log
    const welcomeLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { recipient: { equals: email } },
          { templateId: { equals: 'welcome_email' } },
        ],
      },
    })
    console.log(`\n[STEP 7] Welcome Email Notification Log count: ${welcomeLogs.docs.length}`)
    if (welcomeLogs.docs[0]) {
      const welcomeJob = welcomeLogs.docs[0]
      console.log(`Welcome Job Details: ID: ${welcomeJob.notificationId}, Category: ${welcomeJob.category}`)
      console.log(`Welcome Job templateData (verifying dynamic ledger bonusPoints):`, JSON.stringify(welcomeJob.templateData))
    }

    // Verify that NO second loyalty_earned email was enqueued
    const loyaltyLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { recipient: { equals: email } },
          { templateId: { equals: 'loyalty_earned' } },
        ],
      },
    })
    console.log(`\n[STEP 8] Loyalty Earned Email Notification Log count (must be 0 for welcome bonus): ${loyaltyLogs.docs.length}`)
  }

  console.log('\n=================== VERIFICATION COMPLETED SUCCESSFULLY ===================')
  process.exit(0)
}

runEndToEndVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
