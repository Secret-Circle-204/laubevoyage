'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains/factory'
import { EventOutboxService } from '@/domains/events/outbox'

export async function submitContactRequestAction(params: {
  name: string
  email: string
  subject: string
  message: string
}) {
  try {
    // 1. Fail Fast validation
    if (!params.name?.trim() || !params.email?.trim() || !params.subject?.trim() || !params.message?.trim()) {
      return { success: false, error: 'All fields are required.' }
    }

    if (!params.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const payload = await getPayload({ config })
    const { notification } = await getDomainServices()

    // 2. Persist in database
    const doc = await payload.create({
      collection: 'contact-requests',
      data: {
        name: params.name.trim(),
        email: params.email.trim(),
        subject: params.subject.trim(),
        message: params.message.trim(),
      },
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
    })

    // 4. Enqueue confirmation auto-response email via NotificationService
    try {
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
      })
    } catch (notifErr) {
      console.error('[submitContactRequestAction] Failed to enqueue auto-response:', notifErr)
    }

    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit contact request.',
    }
  }
}
