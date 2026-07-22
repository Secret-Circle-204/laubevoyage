import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExperienceRepository } from '@/domains/experience/repository'
import { InventoryManager } from '@/domains/experience/inventory'

describe('Experience Domain: InventoryManager Integration Tests', () => {
  let mockPayload: any
  let repository: ExperienceRepository
  let inventoryManager: InventoryManager

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    repository = new ExperienceRepository(mockPayload)
    inventoryManager = new InventoryManager(repository)
  })

  it('should reserve capacity, update departure slot reserved seats, and increment version', async () => {
    const result = await inventoryManager.reserveCapacity('dep_101', 1, 2, 5, 101)

    expect(result.slot.capacityReserved).toBe(2)
    expect(result.slot.capacityAvailable).toBe(18)
    expect(result.slot.version).toBe(2)
    expect(result.holdId).toBeDefined()
  })
})
