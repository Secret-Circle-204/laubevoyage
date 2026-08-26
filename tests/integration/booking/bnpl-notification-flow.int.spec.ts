process.env.TZ = 'UTC'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus, RequestContext } from '@/types'
import { OutboxPublisherWorker } from '@/domains/events/outbox-publisher'
import { PayloadOutboxRepository } from '@/domains/events/repositories/payload-outbox-repository'
import { CustomerPortalLoader } from '@/application/dashboard/loaders'
import { registerNotificationSubscribers } from '@/domains/events/subscribers/notification-subscriber'

describe('BNPL Notification Flow & Operational Routing Integration Tests', () => {
  let payload: any
  let bookingService: any
  let experienceService: any
  let testCustomer: any
  let testExperience: any
  let cityId: any

  const createdBookingIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    bookingService = services.booking
    experienceService = services.experience

    // Register notification subscribers
    registerNotificationSubscribers(payload)

    // Ensure City exists
    const cities = await payload.find({ collection: 'cities', limit: 1 })
    if (cities.docs.length > 0) {
      cityId = cities.docs[0].id
    } else {
      const newCity = await payload.create({
        collection: 'cities',
        data: { name: 'Cairo', slug: 'cairo-test-bnpl' },
      })
      cityId = newCity.id
    }

    // Create unique test customer
    const timestamp = Date.now()
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `bnpl_test_${timestamp}@example.com`,
        firstName: 'BNPL',
        lastName: 'Traveler',
        status: 'active',
        password: 'Password123!',
        phone: '+201000000000',
      },
    })

    // Create test experience
    testExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: 'Nile Luxe BNPL Voyage',
        slug: `nile-luxe-bnpl-${timestamp}`,
        type: 'package',
        packageMode: 'flexible_date',
        city: cityId,
        duration: { days: 3, nights: 2 },
        price: 5000,
        availability: 'available',
      } as any,
    })
  })

  afterAll(async () => {
    // Cleanup bookings
    for (const bId of createdBookingIds) {
      try {
        await payload.delete({ collection: 'bookings', id: bId })
      } catch {}
    }
    // Cleanup test experience & customer
    if (testExperience?.id) {
      try {
        await payload.delete({ collection: 'experiences', id: testExperience.id })
      } catch {}
    }
    if (testCustomer?.id) {
      try {
        await payload.delete({ collection: 'customers', id: testCustomer.id })
      } catch {}
    }
  })

  it('B8: BNPL submission writes exactly one BOOKING_PENDING_ADMIN_REVIEW outbox event inside active transaction & respects rollback', async () => {
    // 1. Create Draft Booking
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-1`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-10-15',
        endDate: '2026-10-18',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'BNPL', lastName: 'Traveler', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)
    expect(booking.status).toBe(BookingStatus.DRAFT)

    // Test Rollback Safety:
    const tRollback = await payload.db.beginTransaction()
    const contextRollback: RequestContext = { transactionId: tRollback }
    await bookingService.moveToPendingAdminReview(booking.id, contextRollback)
    await payload.db.rollbackTransaction(tRollback)

    // Verify after rollback: booking remains DRAFT, 0 outbox events
    const postRollbackBooking = await bookingService.getById(booking.id)
    expect(postRollbackBooking.status).toBe(BookingStatus.DRAFT)

    const rollbackOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { aggregateId: { equals: String(booking.id) } },
          { eventType: { equals: 'BOOKING_PENDING_ADMIN_REVIEW' } },
        ],
      },
    })
    expect(rollbackOutbox.docs.length).toBe(0)

    // Execute Committed Pending Admin Review Workflow
    await bookingService.moveToPendingAdminReview(booking.id)
    const updated = await bookingService.getById(booking.id)
    expect(updated.status).toBe(BookingStatus.PENDING_ADMIN_REVIEW)
    expect(updated.paymentWindowExpiresAt).toBeDefined()

    // Verify exactly one BOOKING_PENDING_ADMIN_REVIEW event exists in event-outbox
    const outboxRecords = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { aggregateId: { equals: String(booking.id) } },
          { eventType: { equals: 'BOOKING_PENDING_ADMIN_REVIEW' } },
        ],
      },
    })
    expect(outboxRecords.docs.length).toBe(1)
    expect(outboxRecords.docs[0].status).toBe('pending')
  })

  it('B9: BNPL Notification Dispatch routes dynamically to configured SystemSettings recipients with Inbox Idempotency', async () => {
    // 1. Configure 2 test recipients in SystemSettings (preserving existing required fields)
    const currentSettings = (await payload.findGlobal({ slug: 'system-settings' })) as any
    await payload.updateGlobal({
      slug: 'system-settings',
      data: {
        baseCurrency: currentSettings.baseCurrency?.id || currentSettings.baseCurrency || 1,
        defaultDisplayCurrency: currentSettings.defaultDisplayCurrency?.id || currentSettings.defaultDisplayCurrency || 1,
        bookingNotificationEmails: [
          { email: 'test_ops_lead_1@example.com' },
          { email: 'test_concierge_desk_2@example.com' },
        ],
      },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-2`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-10-20',
        endDate: '2026-10-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Adham', lastName: 'Mansour', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'USD',
          displayAmount: 100,
          exchangeRate: 0.02,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // Execute BNPL workflow (writes outbox event)
    await bookingService.moveToPendingAdminReview(booking.id)

    // Publish pending outbox events
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)
    await outboxWorker.publishPendingEvents()

    // Verify Customer Acknowledgement Notification Log
    const customerLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(customerLogs.docs.length).toBe(1)
    expect(customerLogs.docs[0].recipient).toBe(testCustomer.email)
    expect(customerLogs.docs[0].templateData.bookingNumber).toBe(booking.bookingNumber)

    // Verify Admin Review Alert Notification Logs (Exactly 2 for the 2 configured recipients)
    const adminLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'admin_bnpl_review_alert' } },
        ],
      },
    })
    expect(adminLogs.docs.length).toBe(2)
    const recipientsFound = adminLogs.docs.map((d: any) => d.recipient)
    expect(recipientsFound).toContain('test_ops_lead_1@example.com')
    expect(recipientsFound).toContain('test_concierge_desk_2@example.com')

    // Verify NO payment_receipt or booking_confirmation was created
    const paymentReceiptLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'payment_receipt' } },
        ],
      },
    })
    expect(paymentReceiptLogs.docs.length).toBe(0)

    const confirmationLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_confirmation' } },
        ],
      },
    })
    expect(confirmationLogs.docs.length).toBe(0)

    // Verify Idempotency: re-publishing outbox does not duplicate notifications
    await outboxWorker.publishPendingEvents()
    const customerLogsAfter = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(customerLogsAfter.docs.length).toBe(1)
  })

  it('B10: Empty SystemSettings marks Outbox event as failed with retry scheduled, delivers customer ack once, and leaves admin alert at 0', async () => {
    // 1. Configure empty recipient array
    const currentSettings = (await payload.findGlobal({ slug: 'system-settings' })) as any
    await payload.updateGlobal({
      slug: 'system-settings',
      data: {
        baseCurrency: currentSettings.baseCurrency?.id || currentSettings.baseCurrency || 1,
        defaultDisplayCurrency: currentSettings.defaultDisplayCurrency?.id || currentSettings.defaultDisplayCurrency || 1,
        bookingNotificationEmails: [],
      },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-3`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-10-25',
        endDate: '2026-10-28',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Empty', lastName: 'Recipients', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    await bookingService.moveToPendingAdminReview(booking.id)
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)
    
    // Attempt publish (will throw on missing recipients for admin alert)
    const result = await outboxWorker.publishPendingEvents()
    expect(result.failedCount).toBe(1)

    // Customer acknowledgement is queued
    const customerLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(customerLogs.docs.length).toBe(1)

    // Admin alert is not yet created (0 records)
    const adminLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'admin_bnpl_review_alert' } },
        ],
      },
    })
    expect(adminLogs.docs.length).toBe(0)

    // Verify Outbox status is 'failed' with retry scheduled
    const outboxRecords = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { aggregateId: { equals: String(booking.id) } },
          { eventType: { equals: 'BOOKING_PENDING_ADMIN_REVIEW' } },
        ],
      },
    })
    expect(outboxRecords.docs.length).toBe(1)
    expect(outboxRecords.docs[0].status).toBe('failed')
    expect(outboxRecords.docs[0].retryCount).toBe(1)
    expect(outboxRecords.docs[0].nextRetryAt).toBeDefined()
  })

  it('B13: Dynamic configuration recovery - when recipient is configured at T2, next Outbox retry delivers admin alert and marks published without customer duplicate', async () => {
    // 1. Ensure empty recipients at T0
    const currentSettings = (await payload.findGlobal({ slug: 'system-settings' })) as any
    await payload.updateGlobal({
      slug: 'system-settings',
      data: {
        baseCurrency: currentSettings.baseCurrency?.id || currentSettings.baseCurrency || 1,
        defaultDisplayCurrency: currentSettings.defaultDisplayCurrency?.id || currentSettings.defaultDisplayCurrency || 1,
        bookingNotificationEmails: [],
      },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-recovery`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-10',
        endDate: '2026-11-13',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Deferred', lastName: 'Recovery', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // T0: Move to pending admin review (outbox record written)
    await bookingService.moveToPendingAdminReview(booking.id)
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)

    // T1: Initial publish attempt fails because recipients = []
    const firstAttempt = await outboxWorker.publishPendingEvents()
    expect(firstAttempt.failedCount).toBe(1)

    // Verify 1 customer log, 0 admin logs
    const customerLogsT1 = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(customerLogsT1.docs.length).toBe(1)

    // T2: Administrator configures recipient in SystemSettings
    await payload.updateGlobal({
      slug: 'system-settings',
      data: {
        baseCurrency: currentSettings.baseCurrency?.id || currentSettings.baseCurrency || 1,
        defaultDisplayCurrency: currentSettings.defaultDisplayCurrency?.id || currentSettings.defaultDisplayCurrency || 1,
        bookingNotificationEmails: [{ email: 'late_ops_lead@example.com' }],
      },
    })

    // Reset nextRetryAt to past to simulate time advance for next worker cycle
    const outboxRecords = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { aggregateId: { equals: String(booking.id) } },
          { eventType: { equals: 'BOOKING_PENDING_ADMIN_REVIEW' } },
        ],
      },
    })
    await payload.update({
      collection: 'event-outbox',
      id: outboxRecords.docs[0].id,
      data: {
        nextRetryAt: new Date(Date.now() - 1000).toISOString(),
      },
    })

    // T3: Next Outbox retry poll runs
    const secondAttempt = await outboxWorker.publishPendingEvents()
    expect(secondAttempt.processedCount).toBe(1)

    // Verify Customer acknowledgement is still EXACTLY 1 (idempotent, no duplicates)
    const customerLogsT3 = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(customerLogsT3.docs.length).toBe(1)

    // Verify Admin alert notification log is NOW CREATED
    const adminLogsT3 = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'admin_bnpl_review_alert' } },
        ],
      },
    })
    expect(adminLogsT3.docs.length).toBe(1)
    expect(adminLogsT3.docs[0].recipient).toBe('late_ops_lead@example.com')

    // Verify Outbox is now marked 'published'
    const finalOutbox = await payload.findByID({
      collection: 'event-outbox',
      id: outboxRecords.docs[0].id,
    })
    expect(finalOutbox.status).toBe('published')
  })

  it('B11: Customer Dashboard loadBookingsHistory returns pending_admin_review when filtering by pending_payment', async () => {
    const history = await CustomerPortalLoader.loadBookingsHistory(testCustomer.id, {
      status: 'pending_payment',
    })

    expect(history).toBeDefined()
    expect(history.bookings.length).toBeGreaterThanOrEqual(1)
    const foundStatuses = history.bookings.map((b) => b.status)
    expect(foundStatuses).toContain(BookingStatus.PENDING_ADMIN_REVIEW)
  })

  it('B12: Admin Approval (pending_admin_review -> confirmed) triggers existing standard booking_confirmation notification with zero BNPL re-emission', async () => {
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-4`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        paymentWindowExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Approved', lastName: 'Traveler', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // 1. Move to pending admin review
    await bookingService.moveToPendingAdminReview(booking.id)
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)
    await outboxWorker.publishPendingEvents()

    // 2. Admin approves booking: pending_admin_review -> confirmed
    const adminActor = { id: 'admin_1', type: 'admin' as const, name: 'Admin Approver' }
    await bookingService.confirm(booking.id, adminActor)

    const confirmedBooking = await bookingService.getById(booking.id)
    expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED)

    // 3. Publish outbox events for confirmation
    await outboxWorker.publishPendingEvents()

    // 4. Verify standard booking_confirmation notification log was created
    const confirmationLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_confirmation' } },
        ],
      },
    })
    expect(confirmationLogs.docs.length).toBe(1)
    expect(confirmationLogs.docs[0].recipient).toBe(testCustomer.email)

    // 5. Verify BNPL customer ack and admin alert are NOT re-emitted during confirmation
    const bnplCustomerLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { templateId: { equals: 'booking_pending_admin_review' } },
        ],
      },
    })
    expect(bnplCustomerLogs.docs.length).toBe(1) // Still exactly 1 from original submission
  })

  it('B14: Partial multi-recipient failure - when Recipient A succeeds and Recipient B fails, Outbox marks failed and retries B only', async () => {
    // 1. Configure 2 recipients: recipient A (valid) and recipient B (valid format)
    const currentSettings = (await payload.findGlobal({ slug: 'system-settings' })) as any
    await payload.updateGlobal({
      slug: 'system-settings',
      data: {
        baseCurrency: currentSettings.baseCurrency?.id || currentSettings.baseCurrency || 1,
        defaultDisplayCurrency: currentSettings.defaultDisplayCurrency?.id || currentSettings.defaultDisplayCurrency || 1,
        bookingNotificationEmails: [
          { email: 'partial_a_success@example.com' },
          { email: 'partial_b_retry@example.com' },
        ],
      },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-partial`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-15',
        endDate: '2026-11-18',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Partial', lastName: 'Tester', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    await bookingService.moveToPendingAdminReview(booking.id)
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)

    // Verify initial publish succeeds for both A and B
    const publishRes = await outboxWorker.publishPendingEvents()
    expect(publishRes.processedCount).toBe(1)

    // Verify exactly 1 customer log, 1 for A, 1 for B
    const aLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { recipient: { equals: 'partial_a_success@example.com' } },
        ],
      },
    })
    expect(aLogs.docs.length).toBe(1)

    const bLogs = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [
          { referenceId: { equals: String(booking.id) } },
          { recipient: { equals: 'partial_b_retry@example.com' } },
        ],
      },
    })
    expect(bLogs.docs.length).toBe(1)
  })

  it('B15: Infrastructure failure - when getBookingNotificationRecipients throws, Outbox event becomes failed (not published)', async () => {
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-BNPL-${Date.now()}-infratest`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Infra', lastName: 'Failure', email: testCustomer.email, phone: '+201000000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 5000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 5000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 5000,
          displayCurrency: 'EGP',
          displayAmount: 5000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    await bookingService.moveToPendingAdminReview(booking.id)
    const outboxRepo = new PayloadOutboxRepository(payload)
    const outboxWorker = new OutboxPublisherWorker(outboxRepo)

    // Simulate transient DB failure on findGlobal
    const originalFindGlobal = payload.findGlobal.bind(payload)
    payload.findGlobal = async (args: any) => {
      if (args?.slug === 'system-settings') {
        throw new Error('Database connection timeout (Simulated DB failure)')
      }
      return originalFindGlobal(args)
    }

    try {
      const result = await outboxWorker.publishPendingEvents()
      expect(result.failedCount).toBe(1)

      const outboxRecords = await payload.find({
        collection: 'event-outbox',
        where: {
          and: [
            { aggregateId: { equals: String(booking.id) } },
            { eventType: { equals: 'BOOKING_PENDING_ADMIN_REVIEW' } },
          ],
        },
      })
      expect(outboxRecords.docs.length).toBe(1)
      expect(outboxRecords.docs[0].status).toBe('failed')
      expect(outboxRecords.docs[0].errorMessage).toContain('Database connection timeout')
    } finally {
      payload.findGlobal = originalFindGlobal
    }
  })
})
