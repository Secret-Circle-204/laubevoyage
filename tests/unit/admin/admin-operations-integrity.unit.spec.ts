import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminCustomerOperations } from '@/domains/admin/customer-operations'
import { AdminLoyaltyOperations } from '@/domains/admin/loyalty-operations'
import { AdminService } from '@/domains/admin/service'
import { AdminRepository } from '@/domains/admin/repository'
import { CustomerService } from '@/domains/customer/service'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'
import { LoyaltyService } from '@/domains/loyalty/service'
import { LoyaltyRepository } from '@/domains/loyalty/repository'
import type { AdminUserEntity } from '@/domains/admin/types'

describe('Admin Operations Integrity & Data-Truth Invariants', () => {
  let mockPayload: any
  let mockAdminRepo: any
  let customerService: CustomerService
  let loyaltyService: LoyaltyService
  let adminService: AdminService

  const staffAdmin: AdminUserEntity = {
    id: 'staff_1',
    email: 'staff@laube.com',
    role: 'super_admin',
    status: 'active',
    permissions: ['manage_customers', 'adjust_loyalty_points', 'manage_bookings', 'trigger_maintenance'],
  }

  beforeEach(() => {
    mockPayload = {
      create: vi.fn().mockImplementation(async ({ collection, data }) => ({
        id: 999,
        ...data,
        createdAt: new Date().toISOString(),
      })),
      update: vi.fn().mockImplementation(async ({ collection, id, data }) => ({
        id,
        ...data,
        updatedAt: new Date().toISOString(),
      })),
      findByID: vi.fn().mockImplementation(async ({ collection, id }) => {
        if (collection === 'customers') {
          return {
            id,
            email: 'customer@laube.com',
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
            status: 'active',
            lastLoginAt: '2026-08-19T00:00:00Z',
          }
        }
        return null
      }),
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'point-ledger') {
          if (where?.referenceId || where?.referenceType) {
            return { docs: [], totalDocs: 0 }
          }
          return {
            docs: [
              {
                id: 'ledg_1',
                balance: 1000,
                amount: 1000,
                createdAt: new Date().toISOString(),
              },
            ],
            totalDocs: 1,
          }
        }
        return { docs: [], totalDocs: 0 }
      }),
      findGlobal: vi.fn().mockResolvedValue({
        programCode: 'LAUBE_EXP',
        baseEarnRate: 1,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 10,
        minRedemptionPoints: 500,
        maxRedemptionPercent: 50,
        welcomeBonus: 500,
        expirationMonths: 12,
        isActive: true,
        tiers: [
          { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
          { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 500 },
        ],
      }),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_123'),
      },
    }

    const customerRepo = new CustomerRepository(mockPayload)
    const loyaltyRepo = new LoyaltyRepository(mockPayload)

    mockAdminRepo = {
      saveAuditLog: vi.fn().mockResolvedValue(true),
    }

    const mockChecker = { checkDependencies: vi.fn().mockResolvedValue([]) }
    customerService = new CustomerService(customerRepo, mockChecker as any)
    loyaltyService = new LoyaltyService(loyaltyRepo)

    adminService = new AdminService(
      mockAdminRepo as any,
      customerService,
      loyaltyService,
    )
  })

  describe('Invariant 1: Admin Customer Status Mutation Guarantee', () => {
    it('MUST persist new customer status to database and record audit log on success', async () => {
      const result = await adminService.toggleCustomerStatusByStaff(
        staffAdmin,
        42,
        'suspended',
        'Suspicious fraud activity flagged by staff',
      )

      expect(result).toBe(true)
      // VERIFY: Real database update was called with 'suspended'
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'customers',
          id: 42,
          data: expect.objectContaining({
            status: 'suspended',
          }),
        }),
      )
      // VERIFY: Immutable audit log was persisted
      expect(mockAdminRepo.saveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'toggle_customer_status_staff',
          targetDomain: 'customer',
          targetId: '42',
          reason: 'Suspicious fraud activity flagged by staff',
        }),
      )
    })

    it('MUST throw error if reason is empty or whitespace', async () => {
      const customerOps = new AdminCustomerOperations(customerService)

      await expect(
        customerOps.toggleCustomerStatusByStaff(42, 'suspended', '   '),
      ).rejects.toThrow('[AdminCustomerOperations] Mandatory audit reason required')
      
      expect(mockPayload.update).not.toHaveBeenCalled()
    })

    it('MUST throw error if CustomerService dependency is missing (no fake success)', async () => {
      const customerOps = new AdminCustomerOperations(undefined)

      await expect(
        customerOps.toggleCustomerStatusByStaff(42, 'suspended', 'Valid reason'),
      ).rejects.toThrow('[AdminCustomerOperations] CustomerService dependency is required')
    })
  })

  describe('Invariant 2: Admin Points Adjustment Ledger Guarantee', () => {
    it('MUST create a new immutable record in point-ledger and return real resultingBalance', async () => {
      const result = await adminService.adjustCustomerPointsByStaff(
        staffAdmin,
        42,
        500,
        'Goodwill compensation for delayed transfer',
      )

      expect(result.success).toBe(true)
      // Initial balance 1000 + 500 adjustment = 1500
      expect(result.newBalance).toBe(1500)

      // VERIFY: Immutable ledger entry was created in database
      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'point-ledger',
          data: expect.objectContaining({
            user: 42,
            amount: 500,
            balance: 1500,
            reason: expect.stringContaining('Goodwill compensation for delayed transfer'),
            type: 'manual_adjustment',
          }),
        }),
      )
    })

    it('MUST throw explicit error if LoyaltyService is missing (no silent newBalance: 0 fallback)', async () => {
      const loyaltyOps = new AdminLoyaltyOperations(undefined)

      await expect(
        loyaltyOps.adjustCustomerPointsByStaff(42, 500, 'Staff compensation'),
      ).rejects.toThrow('[AdminLoyaltyOperations] LoyaltyService dependency is required')
    })

    it('MUST throw explicit error if staff adjustment reason is empty', async () => {
      const loyaltyOps = new AdminLoyaltyOperations(loyaltyService)

      await expect(
        loyaltyOps.adjustCustomerPointsByStaff(42, 500, ''),
      ).rejects.toThrow('[AdminLoyaltyOperations] Mandatory audit reason required')

      expect(mockPayload.create).not.toHaveBeenCalled()
    })
  })
})
