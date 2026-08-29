import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function main() {
  console.log("Initializing Payload for Read-Only Forensic Audit...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.\n")

  // 1. Inspect System Settings (Email Sender Settings)
  console.log("=================== 1. SYSTEM SETTINGS (EMAIL SENDER IDENTITIES) ===================")
  const settings = await payload.findGlobal({ slug: 'system-settings' as any })
  console.log("Email Sender Settings in DB:", JSON.stringify(settings.emailSenderSettings, null, 2))

  // 2. Inspect Customer #487
  console.log("\n=================== 2. CUSTOMER RECORD ===================")
  const customers = await payload.find({
    collection: 'customers',
    where: {
      email: { equals: 'nonomazen202@gmail.com' }
    }
  })
  if (customers.docs.length > 0) {
    const cust = customers.docs[0] as any
    console.log(`Customer Found: ID #${cust.id} | Email: ${cust.email} | Status: ${cust.status} | _verified: ${cust._verified} | _verificationToken: ${cust._verificationToken ? 'EXISTS (' + cust._verificationToken.slice(0, 8) + '...)' : 'NONE'} | verificationExpiresAt: ${cust.verificationExpiresAt}`)
  } else {
    console.log("Customer nonomazen202@gmail.com not found.")
  }

  // 3. Inspect Notification Logs / Jobs
  console.log("\n=================== 3. NOTIFICATION LOGS / JOBS ===================")
  const notificationLogs = await payload.find({
    collection: 'notification-logs',
    where: {
      recipient: { equals: 'nonomazen202@gmail.com' }
    },
    sort: '-createdAt'
  })
  console.log(`Found ${notificationLogs.docs.length} notification log(s) for nonomazen202@gmail.com:`)
  notificationLogs.docs.forEach((doc: any) => {
    console.log(`- JobId: ${doc.jobId} | Template: ${doc.templateId} | Category: ${doc.category} | Channel: ${doc.channel} | Status: ${doc.status} | Attempts: ${doc.attempts} | Error: ${doc.lastError || 'None'}`)
  })

  // 4. Inspect Event Outbox
  console.log("\n=================== 4. EVENT OUTBOX (CUSTOMER_REGISTERED) ===================")
  const outboxEvents = await payload.find({
    collection: 'event-outbox',
    where: {
      eventType: { equals: 'CUSTOMER_REGISTERED' }
    },
    sort: '-createdAt',
    limit: 5
  })
  console.log(`Found ${outboxEvents.docs.length} CUSTOMER_REGISTERED outbox event(s):`)
  outboxEvents.docs.forEach((doc: any) => {
    console.log(`- EventID: ${doc.eventId} | Status: ${doc.status} | PublishedAt: ${doc.publishedAt} | Payload: ${JSON.stringify(doc.payload)}`)
  })

  // 5. Inspect Event Inbox
  console.log("\n=================== 5. EVENT INBOX ===================")
  const inboxEvents = await payload.find({
    collection: 'event-inbox',
    sort: '-createdAt',
    limit: 10
  })
  console.log(`Found ${inboxEvents.docs.length} recent event inbox record(s):`)
  inboxEvents.docs.forEach((doc: any) => {
    console.log(`- EventID: ${doc.eventId} | Subscriber: ${doc.subscriberName} | ProcessedAt: ${doc.processedAt} | Status: ${doc.status}`)
  })

  process.exit(0)
}

main().catch((err) => {
  console.error("Forensic script failed:", err)
  process.exit(1)
})
