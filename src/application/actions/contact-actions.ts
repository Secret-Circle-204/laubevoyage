'use server'

import { getPayload } from 'payload'
import type { PayloadRequest } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains/factory'
import { EventOutboxService } from '@/domains/events/outbox'

export async function submitContactRequestAction(params: {
  name: string
  email: string
  subject: string
  message: string
}) {
  let transactionID: string | number | null = null
  const payload = await getPayload({ config })

  try {
    // 1. Fail Fast validation
    if (!params.name?.trim() || !params.email?.trim() || !params.subject?.trim() || !params.message?.trim()) {
      return { success: false, error: 'All fields are required.' }
    }

    if (!params.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const { notification } = await getDomainServices()

    // Start PostgreSQL transactional context
    const activeTx = await payload.db.beginTransaction()
    if (activeTx === null) {
      throw new Error('[submitContactRequestAction] Failed to start database transaction.')
    }
    transactionID = activeTx

    // Class D: Bounded boundary cast to pass custom database transaction token to Payload operations
    const req = {
      transactionID,
    } as unknown as PayloadRequest

    // 2. Persist in database
    const doc = await payload.create({
      collection: 'contact-requests',
      data: {
        name: params.name.trim(),
        email: params.email.trim(),
        subject: params.subject.trim(),
        message: params.message.trim(),
      },
      req,
    })

    // 3. Publish CONTACT_REQUEST_SUBMITTED event
    const outbox = EventOutboxService.getInstance()
    await outbox.recordAndPublish({
      type: 'CONTACT_REQUEST_SUBMITTED',
      eventVersion: 1,
      contactRequestId: Number(doc.id),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      timestamp: new Date().toISOString(),
    }, req)

    // 4. Enqueue confirmation auto-response email via NotificationService
    await notification.enqueueNotification({
      referenceType: 'contact-requests',
      referenceId: String(doc.id),
      recipient: doc.email,
      channel: 'email',
      category: 'marketing',
      templateId: 'welcome_email',
      translationKey: 'welcome_email',
      templateData: {
        name: doc.name,
      },
    }, req)

    // Commit the database transaction
    await payload.db.commitTransaction(transactionID)

    return { success: true }
  } catch (error: unknown) {
    console.error('[submitContactRequestAction] Operation failed. Rolling back transaction.', error)
    if (transactionID) {
      try {
        await payload.db.rollbackTransaction(transactionID)
      } catch (rollbackErr: unknown) {
        const rollbackErrMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)
        console.error('[submitContactRequestAction] Rollback failed:', rollbackErrMsg)
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit contact request.',
    }
  }
}
