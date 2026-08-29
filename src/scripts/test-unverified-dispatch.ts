import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { NotificationWorker } from '../domains/notification/worker'
import { NotificationQueue } from '../domains/notification/queue'
import { NotificationDispatcher } from '../domains/notification/dispatcher'
import { NotificationRepository } from '../domains/notification/repository'

async function testUnverifiedCustomerDispatch() {
  console.log('=================== TESTING UNVERIFIED DISPATCH ===================')
  const payload = await getPayload({ config: configPromise })
  const services = await getDomainServices()
  await services.system.bootstrapSystem({
    customerService: services.customer,
    loyaltyService: services.loyalty,
    notificationService: services.notification,
  })

  const timestamp = Date.now()
  const email = `audit_live_${timestamp}@example.com`
  const firstName = 'Nour'
  const lastName = 'Live'

  console.log(`\n[1] Registering customer: ${email}`)
  const customer = await services.customer.registerCustomer(
    email,
    firstName,
    lastName,
    'LiveSecurePassword123!',
  )
  console.log(`Customer #${customer.customerId} registered with status: ${customer.status}`)

  const notifLogs = await payload.find({
    collection: 'notification-logs',
    where: {
      and: [
        { referenceType: { equals: 'VERIFICATION' } },
        { referenceId: { equals: String(customer.customerId) } },
      ],
    },
  })
  console.log(`Found ${notifLogs.docs.length} verification notification job in DB.`)
  const jobDoc = notifLogs.docs[0]

  console.log('\n[2] Executing NotificationWorker on fresh unverified job...')
  const queue = new NotificationQueue()
  const repository = new NotificationRepository(payload)
  const dispatcher = new NotificationDispatcher()
  const worker = new NotificationWorker(queue, dispatcher, repository)

  // Enqueue job for worker processing
  const rawJob = jobDoc as any
  queue.enqueue({
    jobId: String(rawJob.notificationId),
    referenceType: String(rawJob.referenceType),
    referenceId: String(rawJob.referenceId),
    customerId: Number(customer.customerId),
    recipient: String(rawJob.recipient),
    channel: rawJob.channel as any,
    category: rawJob.category as any,
    priority: rawJob.priority as any,
    templateId: String(rawJob.templateId),
    translationKey: String(rawJob.translationKey || 'customer.verify_email'),
    templateData: (rawJob.templateData as any) || {},
    status: 'queued',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
  })

  const dispatchResult = await worker.processNextJob()
  console.log(`Worker dispatch result: ${dispatchResult}`)

  // Re-inspect DB
  const updatedDoc = await payload.findByID({
    collection: 'notification-logs',
    id: jobDoc.id,
  })
  console.log(`Updated Job in DB: Status: ${updatedDoc.status}, SentAt: ${updatedDoc.sentAt}`)
  console.log(`Updated Job templateData in DB (verifying ZERO token persistence):`, JSON.stringify(updatedDoc.templateData))

  process.exit(0)
}

testUnverifiedCustomerDispatch().catch(err => {
  console.error('Error in test:', err)
  process.exit(1)
})
