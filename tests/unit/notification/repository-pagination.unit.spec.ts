import { describe, it, expect, vi } from 'vitest'
import { NotificationRepository } from '@/domains/notification/repository'
import type { Payload } from 'payload'

describe('Notification Domain: Server-Side Pagination & DB Category Filtering', () => {
  it('should query notification-logs with recipient email, pagination parameters, and category filter', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [
        {
          id: 'n_100',
          notificationId: 'n_100',
          recipient: 'vip.customer@example.com',
          channel: 'email',
          category: 'booking',
          priority: 'high',
          templateId: 'booking_confirmation',
          templateData: { bookingNumber: 'LV-9999' },
          referenceType: 'booking',
          referenceId: '9999',
          status: 'sent',
          attempts: 1,
          createdAt: '2026-08-15T12:00:00Z',
        },
      ],
      totalDocs: 85,
      page: 2,
      totalPages: 5,
      limit: 20,
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new NotificationRepository(mockPayload)
    const result = await repository.findByRecipient('vip.customer@example.com', 2, 20, { category: 'booking' })

    // Verify database query parameters
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(mockFind).toHaveBeenCalledWith({
      collection: 'notification-logs',
      where: {
        recipient: { equals: 'vip.customer@example.com' },
        category: { equals: 'booking' },
      },
      page: 2,
      limit: 20,
      sort: '-createdAt',
      req: undefined,
    })

    // Verify paginated response structure
    expect(result.data.length).toBe(1)
    expect(result.data[0].jobId).toBe('n_100')
    expect(result.data[0].category).toBe('booking')
    expect(result.total).toBe(85)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(5)
    expect(result.limit).toBe(20)
  })

  it('should query notification-logs without status filter when no status is provided', async () => {
    const mockFind = vi.fn().mockResolvedValue({
      docs: [],
      totalDocs: 0,
      page: 1,
      totalPages: 1,
      limit: 20,
    })

    const mockPayload = {
      find: mockFind,
    } as unknown as Payload

    const repository = new NotificationRepository(mockPayload)
    const result = await repository.findByRecipient('client@laube.com', 1, 20)

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'notification-logs',
      where: {
        recipient: { equals: 'client@laube.com' },
      },
      page: 1,
      limit: 20,
      sort: '-createdAt',
      req: undefined,
    })

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
  })
})
