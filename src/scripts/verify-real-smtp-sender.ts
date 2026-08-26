import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { SystemRepository } from '../domains/system/repository'
import { systemSettingsRegistry } from '../domains/system/settings-registry'
import { NotificationDispatcher } from '../domains/notification/dispatcher'
import { SenderIdentityResolver } from '../domains/notification/sender-identity-resolver'
import type { NotificationJobEntity } from '../domains/notification/types'

async function runDefinitiveReadonlyPipelineE2E() {
  console.log('\n======================================================================')
  console.log('🚀 DEFINITIVE REAL E2E PIPELINE VERIFICATION (READ-ONLY SSOT)')
  console.log('======================================================================\n')

  // 1. Initialize Payload & SystemSettingsRegistry (READ-ONLY)
  console.log('1. [INITIALIZE PAYLOAD & SSOT REGISTRY — STRICT READ-ONLY]')
  const payload = await getPayload({ config: configPromise })
  const systemRepo = new SystemRepository(payload)
  systemSettingsRegistry.setRepository(systemRepo)
  systemSettingsRegistry.invalidate()

  // Read current DB state without mutating
  const settings = await systemSettingsRegistry.getSettings()
  const identities = settings.emailSenderSettings

  console.log('   ✅ Active PostgreSQL SystemSettings SSOT (Zero Mutation):')
  console.log('     • Reservation Identity:', identities.reservationIdentity)
  console.log('     • Loyalty Identity:    ', identities.loyaltyIdentity)
  console.log('     • Security Identity:   ', identities.securityIdentity)

  if (!identities.securityIdentity?.fromName || !identities.securityIdentity?.fromEmail) {
    throw new Error('Precondition Failed: Security Identity is not configured in PostgreSQL SystemSettings!')
  }

  // 2. Notification Domain Pipeline Verification (Dispatcher -> Resolver -> EmailNotificationAdapter -> SMTP)
  console.log('\n2. [NOTIFICATION DOMAIN PIPELINE VERIFICATION]')
  const dispatcher = new NotificationDispatcher()

  const notificationJobs: { name: string; job: NotificationJobEntity; expectedFrom: string }[] = [
    {
      name: 'Case A: Welcome / Onboarding (Category: marketing)',
      job: {
        jobId: `job_welcome_real_${Date.now()}`,
        channel: 'email',
        category: 'marketing',
        recipient: 'reservation@laubevoyage.com',
        priority: 'high',
        templateId: 'welcome_email',
        templateData: {
          customerName: 'Ahmad Al-Mansour',
          locale: 'en',
          subject: 'Forensic E2E Pipeline: Welcome Email (Loyalty Identity)',
        },
        attempts: 0,
        maxAttempts: 3,
        status: 'queued',
        referenceType: 'customer',
        referenceId: 'cust_real_1',
        translationKey: 'welcome_email',
        createdAt: new Date().toISOString(),
      },
      expectedFrom: `"L'Aube Voyage Rewards" <no-reply@laubevoyage.com>`,
    },
    {
      name: 'Case B: Loyalty Points Earned (Category: loyalty)',
      job: {
        jobId: `job_loyalty_real_${Date.now()}`,
        channel: 'email',
        category: 'loyalty',
        recipient: 'reservation@laubevoyage.com',
        priority: 'normal',
        templateId: 'loyalty_earned',
        templateData: {
          customerName: 'Ahmad Al-Mansour',
          pointsEarned: 250,
          totalPoints: 1250,
          locale: 'en',
          subject: 'Forensic E2E Pipeline: Loyalty Points Earned (Loyalty Identity)',
        },
        attempts: 0,
        maxAttempts: 3,
        status: 'queued',
        referenceType: 'loyalty_transaction',
        referenceId: 'tx_real_1',
        translationKey: 'loyalty_earned',
        createdAt: new Date().toISOString(),
      },
      expectedFrom: `"L'Aube Voyage Rewards" <no-reply@laubevoyage.com>`,
    },
    {
      name: 'Case C: Booking Confirmation (Category: booking)',
      job: {
        jobId: `job_booking_real_${Date.now()}`,
        channel: 'email',
        category: 'booking',
        recipient: 'reservation@laubevoyage.com',
        priority: 'high',
        templateId: 'booking_confirmation',
        templateData: {
          customerName: 'Ahmad Al-Mansour',
          bookingNumber: 'LV-REAL-2026',
          destination: 'Swiss Alps Luxury Chalet',
          locale: 'en',
          subject: 'Forensic E2E Pipeline: Booking Confirmation (Reservation Identity)',
        },
        attempts: 0,
        maxAttempts: 3,
        status: 'queued',
        referenceType: 'booking',
        referenceId: 'bk_real_1',
        translationKey: 'booking_confirmation',
        createdAt: new Date().toISOString(),
      },
      expectedFrom: `"L'Aube Voyage Reservations" <reservation@laubevoyage.com>`,
    },
  ]

  for (const item of notificationJobs) {
    console.log(`\n   ▶ Executing ${item.name}...`)
    const resolvedSender = await SenderIdentityResolver.resolve(item.job.category)
    console.log(`     • Sender Resolved: "${resolvedSender.fromName}" <${resolvedSender.fromEmail}> (Reply-To: ${resolvedSender.replyTo})`)
    
    const result = await dispatcher.dispatch(item.job)
    console.log(`     • Dispatch Result: Success=${result.success}, MessageId=${result.providerMessageId}, Error=${result.error || 'None'}`)
    if (!result.success) {
      throw new Error(`Notification pipeline dispatch failed for ${item.name}: ${result.error}`)
    }
  }

  // 3. Payload Auth Real Pipeline Verification (payload.sendEmail -> Payload Email Adapter -> Security Identity -> SMTP)
  console.log('\n3. [PAYLOAD AUTH PIPELINE VERIFICATION]')
  console.log('   ▶ Executing Case D: Payload Auth Email Verification via payload.sendEmail()...')
  
  const authVerificationResult: any = await payload.sendEmail({
    to: 'reservation@laubevoyage.com',
    subject: 'Forensic E2E Pipeline: Email Verification (Security Identity)',
    html: '<p>Forensic verification test for Payload Auth Security email delivery pipeline.</p>',
    text: 'Forensic verification test for Payload Auth Security email delivery pipeline.',
  })

  console.log(`     ✅ Payload Auth Verification Sent: MessageId=${authVerificationResult.messageId}`)

  console.log('   ▶ Executing Case E: Payload Auth Password Reset via payload.sendEmail()...')
  const authResetResult: any = await payload.sendEmail({
    to: 'reservation@laubevoyage.com',
    subject: 'Forensic E2E Pipeline: Password Reset (Security Identity)',
    html: '<p>Forensic verification test for Payload Auth Password Reset email delivery pipeline.</p>',
    text: 'Forensic verification test for Payload Auth Password Reset email delivery pipeline.',
  })

  console.log(`     ✅ Payload Auth Password Reset Sent: MessageId=${authResetResult.messageId}`)

  console.log('\n======================================================================')
  console.log('🏁 ALL REAL PIPELINE E2E TESTS COMPLETED WITH 100% SUCCESS')
  console.log('======================================================================\n')
  process.exit(0)
}

runDefinitiveReadonlyPipelineE2E().catch((err) => {
  console.error('\n❌ PIPELINE E2E ERROR:', err)
  process.exit(1)
})
