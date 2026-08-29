process.env.TZ = 'UTC'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { PayloadOutboxRepository } from '@/domains/events/repositories/payload-outbox-repository'

describe('Integration: Customer Deletion Guard Against Pending Outbox Events (Gate 7)', () => {
  let payload: any
  let outboxRepo: PayloadOutboxRepository
  let testCustomer: any
  const createdEventIds: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    await getDomainServices()
    outboxRepo = new PayloadOutboxRepository(payload)

    // Create a real test customer
    const timestamp = Date.now()
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `del_guard_${timestamp}@example.com`,
        firstName: 'DeletionGuard',
        lastName: 'Tester',
        status: 'active',
        password: 'Password123!',
        phone: '+201099999999',
      },
    })
  })

  afterAll(async () => {
    // Clean up any remaining test outbox entries
    if (createdEventIds.length > 0) {
      await payload.delete({
        collection: 'event-outbox',
        where: {
          eventId: { in: createdEventIds },
        },
      })
    }

    // Clean up outbox by customerId
    const outbox = await payload.find({ collection: 'event-outbox', limit: 1000 })
    for (const doc of outbox.docs) {
      const pCustId = doc.payload?.customerId || doc.payload?.customer?.id || doc.payload?.booking?.customerId
      if (pCustId === testCustomer?.id) {
        await payload.delete({ collection: 'event-outbox', id: doc.id })
      }
    }

    // Ensure customer is deleted
    try {
      if (testCustomer?.id) {
        await payload.delete({
          collection: 'customers',
          id: testCustomer.id,
        })
      }
    } catch {
      // Already deleted during test
    }
  })

  it('rejects customer deletion when pending outbox events exist for the customer (payload.customerId)', async () => {
    const eventId = `evt_guard_pend_${Date.now()}`
    createdEventIds.push(eventId)

    await outboxRepo.add({
      type: 'LOYALTY_EARNED',
      eventId,
      correlationId: `corr_${Date.now()}`,
      occurredAt: new Date().toISOString(),
      eventVersion: 1,
      customerId: testCustomer.id,
      points: 500,
      balance: 500,
    } as any)

    // Attempt Customer deletion through the actual production beforeCustomerDelete hook
    await expect(
      payload.delete({
        collection: 'customers',
        id: testCustomer.id,
      }),
    ).rejects.toThrow(/pending\/in-flight outbox event/)

    // Assert Customer still exists in database
    const customerInDb = await payload.findByID({
      collection: 'customers',
      id: testCustomer.id,
    })
    expect(customerInDb).not.toBeNull()
    expect(customerInDb.id).toBe(testCustomer.id)

    // Assert Outbox event still exists in pending status
    const outboxRes = await payload.find({
      collection: 'event-outbox',
      where: { eventId: { equals: eventId } },
      limit: 1,
    })
    expect(outboxRes.docs.length).toBe(1)
    expect(outboxRes.docs[0].status).toBe('pending')
  })

  it('rejects customer deletion when alternate payload shape has pending event (payload.customer.id)', async () => {
    const eventId = `evt_guard_alt_${Date.now()}`
    createdEventIds.push(eventId)

    await payload.create({
      collection: 'event-outbox',
      data: {
        eventId,
        correlationId: `corr_alt_${Date.now()}`,
        eventType: 'CUSTOMER_UPDATED',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        aggregateType: 'Customer',
        aggregateId: String(testCustomer.id),
        status: 'failed', // Even failed/in-retry events block deletion
        retryCount: 1,
        payload: {
          type: 'CUSTOMER_UPDATED',
          eventId,
          customer: { id: testCustomer.id },
        },
      },
    })

    // Attempt Customer deletion
    await expect(
      payload.delete({
        collection: 'customers',
        id: testCustomer.id,
      }),
    ).rejects.toThrow(/pending\/in-flight outbox event/)
  })

  it('allows customer deletion once all outbox events are resolved/published and leaves zero orphaned events', async () => {
    // Mark all test customer outbox events as published (resolved)
    await payload.update({
      collection: 'event-outbox',
      where: {
        eventId: { in: createdEventIds },
      },
      data: {
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
    })

    // Also mark the registration event created during customer creation as published
    await payload.update({
      collection: 'event-outbox',
      where: {
        and: [
          { status: { in: ['pending', 'processing', 'failed'] } },
          {
            or: [
              { 'payload.customerId': { equals: testCustomer.id } },
              { 'payload.customer.id': { equals: testCustomer.id } },
            ],
          },
        ],
      },
      data: {
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
    })

    // Now delete customer through the production path
    const deleteResult = await payload.delete({
      collection: 'customers',
      id: testCustomer.id,
    })
    expect(deleteResult.id).toBe(testCustomer.id)

    // Verify Customer no longer exists
    await expect(
      payload.findByID({
        collection: 'customers',
        id: testCustomer.id,
      }),
    ).rejects.toThrow()

    // Assert no pending/failed/processing outbox events remain for this customer
    const remainingOutbox = await payload.find({
      collection: 'event-outbox',
      where: {
        and: [
          { status: { in: ['pending', 'processing', 'failed'] } },
          {
            or: [
              { 'payload.customerId': { equals: testCustomer.id } },
              { 'payload.customer.id': { equals: testCustomer.id } },
            ],
          },
        ],
      },
    })
    expect(remainingOutbox.totalDocs).toBe(0)
  })
})
