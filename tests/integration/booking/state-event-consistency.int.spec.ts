process.env.TZ = 'UTC'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus, RequestContext } from '@/types'
import { EventBus } from '@/domains/events/event-bus'
import { OutboxPublisherWorker } from '@/domains/events/outbox-publisher'
import { PayloadOutboxRepository } from '@/domains/events/repositories/payload-outbox-repository'
import { EventOutboxService } from '@/domains/events/outbox'

// Import subscribers to trigger their event bus registrations
import '@/domains/events/subscribers/loyalty-subscriber'
import '@/domains/events/subscribers/dashboard-subscriber'

describe('P1-B Integration: Transactional Event Consistency & Outbox Reliability', () => {
  let payload: any
  let bookingService: any
  let experienceService: any
  let loyaltyService: any
  let testCustomer: any
  let testExperience: any
  let cityId: any

  const createdBookingIds: number[] = []
  const createdSlotIds: number[] = []
  const createdOutboxIds: number[] = []
  const createdExperienceIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    bookingService = services.booking
    experienceService = services.experience
    loyaltyService = services.loyalty

    // Clean up all BK-TEST bookings from previous runs
    const bookings = await payload.find({ collection: 'bookings', limit: 1000 })
    for (const doc of bookings.docs) {
      if (doc.bookingNumber && doc.bookingNumber.startsWith('BK-TEST-')) {
        await payload.delete({ collection: 'bookings', id: doc.id })
      }
    }

    // Clean up all DEP- slots
    const slots = await payload.find({ collection: 'departure-slots', limit: 1000 })
    for (const doc of slots.docs) {
      if (doc.departureId && doc.departureId.startsWith('DEP-')) {
        await payload.delete({ collection: 'departure-slots', id: doc.id })
      }
    }

    // Clean up all event outbox entries to ensure B6 runs in isolation
    const outbox = await payload.find({ collection: 'event-outbox', limit: 1000 })
    for (const doc of outbox.docs) {
      await payload.delete({ collection: 'event-outbox', id: doc.id })
    }

    // Clean up all event inbox entries
    const inbox = await payload.find({ collection: 'event-inbox', limit: 1000 })
    for (const doc of inbox.docs) {
      await payload.delete({ collection: 'event-inbox', id: doc.id })
    }

    // Force register all system subscribers in this Vitest worker process
    const systemWorkflow = (services.system as any).workflowEngine
    if (systemWorkflow) {
      systemWorkflow.isBootstrapped = false
    }
    const globalContext = global as any
    globalContext[Symbol.for('laube.subscribers.bootstrapped')] = false

    await services.system.bootstrapSystem({
      outboxService: EventOutboxService.getInstance(),
      notificationService: services.notification,
      customerService: services.customer,
      loyaltyService: services.loyalty,
    })

    // Create Test Customer
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `test_outbox_consistency_${Date.now()}@example.com`,
        firstName: 'Outbox',
        lastName: 'TestUser',
        status: 'active',
        password: 'password123',
      },
    })

    // Create Test Experience
    const cityRes = await payload.find({ collection: 'cities', limit: 1 })
    cityId = cityRes.docs.length > 0 ? cityRes.docs[0].id : 1

    testExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: `Outbox Consistency Test Experience ${Date.now()}`,
        slug: `outbox-consistency-test-${Date.now()}`,
        type: 'package',
        packageMode: 'flexible_date',
        city: cityId,
        duration: { days: 3, nights: 2 },
        price: 3000,
        availability: 'available',
      } as any,
    })
  })

  it('B1 & B2: Cancellation Commit and Rollback under Transaction Identity', async () => {
    // 1. Create a confirmed booking
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-c1`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.CONFIRMED,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // --- TEST B2: ROLLBACK SAFETY ---
    const tRollback = await payload.db.beginTransaction()
    const contextRollback: RequestContext = { transactionId: tRollback }

    // Execute cancellation within transaction that will be rolled back
    await bookingService.cancel(booking.id, 'Rollback Test', { type: 'admin', id: 'admin_1', name: 'Admin' }, contextRollback)

    // Rollback transaction
    await payload.db.rollbackTransaction(tRollback)

    // Verify: booking remains CONFIRMED, no outbox event exists
    const postRollbackBooking = await bookingService.getById(booking.id)
    expect(postRollbackBooking.status).toBe(BookingStatus.CONFIRMED)

    const rollbackOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_CANCELLED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(rollbackOutbox.docs.length).toBe(0)

    // --- TEST B1 & TRANSACTION IDENTITY PROOF ---
    const tCommit = await payload.db.beginTransaction()
    const contextCommit: RequestContext = { transactionId: tCommit }

    // Start cancellation within contextCommit
    await bookingService.cancel(booking.id, 'Commit Test', { type: 'admin', id: 'admin_1', name: 'Admin' }, contextCommit)

    // Identity verification: Read state from outside transaction (it should still be CONFIRMED and outbox empty)
    const outsideBookingRead = await bookingService.getById(booking.id)
    expect(outsideBookingRead.status).toBe(BookingStatus.CONFIRMED)

    const outsideOutboxRead = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_CANCELLED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(outsideOutboxRead.docs.length).toBe(0)

    // Commit transaction
    await payload.db.commitTransaction(tCommit)

    // Verify: status is CANCELLED and outbox event exists
    const finalBooking = await bookingService.getById(booking.id)
    expect(finalBooking.status).toBe(BookingStatus.CANCELLED)

    const finalOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_CANCELLED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(finalOutbox.docs.length).toBe(1)
    expect(finalOutbox.docs[0].payload.booking.id).toBe(booking.id)
  })

  it('B3 & B4: Completion Commit and Rollback under Transaction Identity', async () => {
    // 1. Create a confirmed booking
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-c2`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.CONFIRMED,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        completionAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Completed 1 day ago
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // --- TEST B4: ROLLBACK SAFETY ---
    const tRollback = await payload.db.beginTransaction()
    const contextRollback: RequestContext = { transactionId: tRollback }

    await bookingService.complete(booking.id, contextRollback)
    await payload.db.rollbackTransaction(tRollback)

    const postRollbackBooking = await bookingService.getById(booking.id)
    expect(postRollbackBooking.status).toBe(BookingStatus.CONFIRMED)

    const rollbackOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_COMPLETED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(rollbackOutbox.docs.length).toBe(0)

    // --- TEST B3: COMMIT AND TRANSACTION IDENTITY PROOF ---
    const tCommit = await payload.db.beginTransaction()
    const contextCommit: RequestContext = { transactionId: tCommit }

    await bookingService.complete(booking.id, contextCommit)

    // Check isolation
    const outsideBookingRead = await bookingService.getById(booking.id)
    expect(outsideBookingRead.status).toBe(BookingStatus.CONFIRMED)

    await payload.db.commitTransaction(tCommit)

    const finalBooking = await bookingService.getById(booking.id)
    expect(finalBooking.status).toBe(BookingStatus.COMPLETED)

    const finalOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_COMPLETED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(finalOutbox.docs.length).toBe(1)
  })

  it('B5: Expiration Rollback Safety', async () => {
    // 1. Create a daily tour test experience to allow clean departure slot creation
    const dailyExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: `Daily Tour Test ${Date.now()}`,
        slug: `daily-tour-test-${Date.now()}`,
        type: 'daily_tour',
        city: cityId,
        price: 1000,
        availability: 'available',
        duration: {
          durationMinutes: 120
        },
        schedules: [
          { startTime: '09:00', defaultCapacity: 10 }
        ]
      } as any
    })
    createdExperienceIds.push(dailyExperience.id)

    // 2. Create the departure slot using the domain service
    const slot = await experienceService.getOrCreateDailyDeparture(dailyExperience.id, '2026-11-20', '09:00')
    createdSlotIds.push(slot.id)

    // 3. Create a draft booking with past payment window and complete capacityHold pointing to slot
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-c3`,
        user: testCustomer.id,
        experience: dailyExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        paymentWindowExpiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Expired 30 mins ago
        capacityHold: {
          holdId: `hold_${Date.now()}`,
          seats: 1,
          status: 'active',
          experienceId: dailyExperience.id,
          date: '2026-11-20',
          expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // Spy on experienceService.getDepartureSlotByDate to return our slot, and releaseCapacity to force throw an error inside the expiration pipeline
    const getSlotSpy = vi.spyOn(experienceService, 'getDepartureSlotByDate').mockImplementation(async (expId, date) => {
      if (expId === dailyExperience.id) {
        return {
          id: slot.id,
          departureId: slot.departureId,
          experienceId: dailyExperience.id,
          date: '2026-11-20',
          startTime: '09:00',
          capacityTotal: 10,
          capacityReserved: 1,
          capacityAvailable: 9,
          version: 1,
          status: 'available'
        }
      }
      return null
    })

    const releaseSpy = vi.spyOn(experienceService, 'releaseCapacity').mockImplementation(async (departureId, seats, context) => {
      if (departureId === slot.departureId) {
        throw new Error('Forced Capacity Release Failure')
      }
    })

    // Trigger expiration. Since capacity release fails, the expiration process will throw, rolling back the transaction.
    const result = await bookingService.processExpiredBookings(15).catch(() => 0)

    // Verify DB: booking status remains DRAFT, and no BOOKING_EXPIRED outbox record exists
    const finalBooking = await bookingService.getById(booking.id)
    expect(finalBooking.status).toBe(BookingStatus.DRAFT)

    const finalOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_EXPIRED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(finalOutbox.docs.length).toBe(0)

    releaseSpy.mockRestore()
    getSlotSpy.mockRestore()
  })

  it('B5_alt: Expiration Malformed Hold Bypass', async () => {
    // 1. Create a draft booking with malformed capacityHold (missing experienceId/date)
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-c3-alt`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        capacityHold: {
          holdId: `hold_${Date.now()}`,
          seats: 1,
          status: 'active',
          expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    const getSlotSpy = vi.spyOn(experienceService, 'getDepartureSlotByDate')

    // Trigger expiration. Since the hold is malformed, the pipeline should bypass capacity resolution and successfully expire the booking.
    const expiredCount = await bookingService.processExpiredBookings(15)

    // Verify DB: booking status is now EXPIRED, and event outbox record exists
    const finalBooking = await bookingService.getById(booking.id)
    expect(finalBooking.status).toBe(BookingStatus.EXPIRED)

    // Prove that getDepartureSlotByDate was never called with NaN or undefined parameters (i.e. malformed B5_alt booking did not call it)
    const hasInvalidCall = getSlotSpy.mock.calls.some((args) => {
      const expId = args[0] as unknown
      const date = args[1] as unknown
      return (typeof expId === 'number' && isNaN(expId)) || expId === undefined || date === undefined
    })
    expect(hasInvalidCall).toBe(false)

    const finalOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { eventType: { equals: 'BOOKING_EXPIRED' } },
          { 'payload.booking.id': { equals: booking.id } }
        ]
      }
    })
    expect(finalOutbox.docs.length).toBe(1)

    getSlotSpy.mockRestore()
  })

  it('B6: Outbox Delivery (Publish Pending Events with Exact Payload)', async () => {
    // 1. Create a completion outbox event payload
    const eventId = `evt_test_del_${Date.now()}`
    const correlationId = `corr_test_del_${Date.now()}`
    const bookingData = { id: 8888, bookingNumber: 'BK-TEST-B6', status: BookingStatus.COMPLETED } as any

    const outboxRepo = new PayloadOutboxRepository(payload)
    const worker = new OutboxPublisherWorker(outboxRepo)

    const eventBus = EventBus.getInstance()
    let receivedEvent: any = null

    // Subscribe to EventBus to receive worker dispatch, filtering by eventId
    eventBus.subscribe('BOOKING_COMPLETED', 'TestB6Subscriber', async (event) => {
      console.log('[TestB6Subscriber] Received Event:', JSON.stringify(event))
      if (event.eventId === eventId) {
        receivedEvent = event
      }
    })

    // Record the event inside the outbox
    const outboxRecord = await outboxRepo.add({
      type: 'BOOKING_COMPLETED',
      eventId,
      correlationId,
      occurredAt: new Date().toISOString(),
      eventVersion: 1,
      booking: bookingData,
      actor: { id: 'system', type: 'system', name: 'Worker' },
    })
    createdOutboxIds.push((outboxRecord as unknown as { id: number }).id)

    // Let worker process pending outbox events
    const processResult = await worker.publishPendingEvents()
    expect(processResult.processedCount).toBeGreaterThanOrEqual(1)

    // Verify received event properties are identical to the stored outbox payload
    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent.eventId).toBe(eventId)
    expect(receivedEvent.correlationId).toBe(correlationId)
    expect(receivedEvent.type).toBe('BOOKING_COMPLETED')
    expect(receivedEvent.booking.bookingNumber).toBe('BK-TEST-B6')
  })

  it('B7: Consumer Idempotency Guard verification', async () => {
    const eventId = `evt_dup_test_${Date.now()}`
    const correlationId = `corr_dup_test_${Date.now()}`

    // Create a confirmed booking to satisfy foreign key constraint on points ledger
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-c7`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.CONFIRMED,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          version: 1,
          basePriceEGP: 1000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 1000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 1000,
          displayCurrency: 'EGP',
          displayAmount: 1000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    createdBookingIds.push(booking.id)

    // 1. Earn points first so we can test points reversal
    const earnTx = await payload.db.beginTransaction()
    await loyaltyService.earnPointsForBooking(testCustomer.id, booking.id, 1000, booking.bookingNumber, undefined, { transactionId: earnTx })
    await payload.db.commitTransaction(earnTx)

    // Get current balance
    const startBalance = await loyaltyService.getCustomerBalance(testCustomer.id)

    // Get the points earned from ledger
    const ledgerDocs = await payload.find({
      collection: 'point-ledger',
      where: {
        and: [
          { user: { equals: testCustomer.id } },
          { booking: { equals: booking.id } },
          { type: { equals: 'earn' } }
        ]
      }
    })
    const pointsEarned = ledgerDocs.docs.length > 0 ? ledgerDocs.docs[0].amount : 1000

    // 2. Dispatch cancellation event twice to EventBus with the same eventId
    const eventPayload = {
      eventId,
      correlationId,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'BOOKING_CANCELLED' as const,
      booking: {
        id: booking.id,
        customerId: testCustomer.id,
        pricingSnapshot: { totalAmountEGP: 1000 },
      } as any,
      actor: { id: 'system', type: 'system', name: 'Worker' },
      reason: 'Duplicate Cancel test',
      timestamp: new Date().toISOString(),
    }

    const eventBus = EventBus.getInstance()
    
    // First delivery (processes points reversal)
    await eventBus.publish(eventPayload)

    // Second delivery (ignored by inbox idempotency check)
    await eventBus.publish(eventPayload)

    // Verify DB: Balance was reduced by the earned points amount only ONCE
    const endBalance = await loyaltyService.getCustomerBalance(testCustomer.id)
    expect(startBalance - endBalance).toBe(pointsEarned) // Exactly 1 points reversal processed!

    // Verify inbox registry has exactly 1 entry for this eventId
    const inboxDocs = await payload.find({
      collection: 'event-inbox',
      where: {
        processedEventId: { equals: eventId }
      }
    })
    expect(inboxDocs.docs.length).toBe(1)
  })

  afterAll(async () => {
    // Delete all bookings created during tests
    if (createdBookingIds.length > 0) {
      await payload.delete({
        collection: 'bookings',
        where: {
          id: { in: createdBookingIds }
        }
      })
    }

    // Delete specific outbox entries created during tests
    if (createdOutboxIds.length > 0) {
      await payload.delete({
        collection: 'event-outbox',
        where: {
          id: { in: createdOutboxIds }
        }
      })
    }

    // Also delete any other outbox events generated dynamically by our tracked test bookings
    const outbox = await payload.find({ collection: 'event-outbox', limit: 1000 })
    for (const doc of outbox.docs) {
      if (doc.payload?.booking?.id && createdBookingIds.includes(doc.payload.booking.id)) {
        await payload.delete({ collection: 'event-outbox', id: doc.id })
      }
    }

    // Delete point ledger for our test customer
    await payload.delete({
      collection: 'point-ledger',
      where: {
        user: { equals: testCustomer.id }
      }
    })

    // Delete inbox entries
    const inbox = await payload.find({ collection: 'event-inbox', limit: 1000 })
    for (const doc of inbox.docs) {
      if (doc.processedEventId && (doc.processedEventId.startsWith('evt_test_') || doc.processedEventId.startsWith('evt_dup_'))) {
        await payload.delete({ collection: 'event-inbox', id: doc.id })
      }
    }

    // Delete departure slots created
    if (createdSlotIds.length > 0) {
      await payload.delete({
        collection: 'departure-slots',
        where: {
          id: { in: createdSlotIds }
        }
      })
    }

    // Delete customer & experience
    await payload.delete({
      collection: 'customers',
      where: {
        id: { equals: testCustomer.id }
      }
    })
    await payload.delete({
      collection: 'experiences',
      where: {
        id: { equals: testExperience.id }
      }
    })

    // Delete created test experiences
    if (createdExperienceIds.length > 0) {
      await payload.delete({
        collection: 'experiences',
        where: {
          id: { in: createdExperienceIds }
        }
      })
    }
  })
})
