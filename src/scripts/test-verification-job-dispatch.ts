import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { NotificationWorker } from '../domains/notification/worker'
import { NotificationQueue } from '../domains/notification/queue'
import { NotificationDispatcher } from '../domains/notification/dispatcher'
import { NotificationRepository } from '../domains/notification/repository'

async function testVerificationJobDispatch() {
  const payload = await getPayload({ config: configPromise })
  const queue = new NotificationQueue()
  const repository = new NotificationRepository(payload)
  const dispatcher = new NotificationDispatcher()
  const worker = new NotificationWorker(queue, dispatcher, repository)

  // Find job for customer 511
  const notifLogs = await payload.find({
    collection: 'notification-logs',
    where: {
      and: [
        { referenceType: { equals: 'VERIFICATION' } },
        { referenceId: { equals: '511' } },
        { templateId: { equals: 'verification_email' } },
      ],
    },
  })

  console.log(`Found ${notifLogs.docs.length} verification jobs for customer 511:`)
  const jobDoc = notifLogs.docs[0]
  if (!jobDoc) {
    console.log('No job found.')
    process.exit(1)
  }

  console.log(`Job ID: ${jobDoc.notificationId}, Status: ${jobDoc.status}`)
  
  // Since customer 511 was verified in Step 5, let's see how CustomerPolicy handles it:
  // Policy should return ALREADY_VERIFIED and mark job as sent (skipped already verified)!
  const rawJob = jobDoc as any
  queue.enqueue({
    jobId: String(rawJob.notificationId),
    referenceType: String(rawJob.referenceType),
    referenceId: String(rawJob.referenceId),
    customerId: Number(rawJob.customerId || rawJob.referenceId),
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

  console.log('\n--- Processing Job through Worker ---')
  const result = await worker.processNextJob()
  console.log('Worker execution result:', result)

  const updatedDoc = await payload.findByID({
    collection: 'notification-logs',
    id: jobDoc.id,
  })
  console.log(`Updated Job in DB: Status: ${updatedDoc.status}, SentAt: ${updatedDoc.sentAt}`)
  console.log(`Updated Job templateData in DB (verifying ZERO token persistence):`, JSON.stringify(updatedDoc.templateData))

  process.exit(0)
}

testVerificationJobDispatch().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
