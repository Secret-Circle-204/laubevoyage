import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TravelerRepository } from '@/domains/customer/repositories/traveler-repository'

describe('Customer Domain: Profile Repositories Integration Tests', () => {
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      create: vi.fn().mockImplementation(({ collection, data }) =>
        Promise.resolve({ id: 101, ...data }),
      ),
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }
  })

  it('should add companion traveler to independent customer-travelers collection', async () => {
    const travelerRepo = new TravelerRepository(mockPayload)
    const traveler = await travelerRepo.addTraveler({
      customerId: 1,
      firstName: 'Fatima',
      lastName: 'Hassan',
      relationship: 'spouse',
    })

    expect(traveler.travelerId).toBe('101')
    expect(traveler.firstName).toBe('Fatima')
    expect(traveler.relationship).toBe('spouse')
  })
})
